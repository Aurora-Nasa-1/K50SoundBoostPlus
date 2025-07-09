#!/bin/bash
# Aurora Module Build Script
set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SETTINGS_FILE="$PROJECT_ROOT/module/settings.json"
BUILD_DIR="$PROJECT_ROOT/build_output"
MODULE_DIR="$BUILD_DIR/module"
# Use ANDROID_NDK_ROOT from environment (GitHub Actions) or fallback to local path
NDK_DIR="${ANDROID_NDK_ROOT:-$PROJECT_ROOT/android-ndk}"

# Colors
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
NC='\033[0m'

# Logging functions
log() { echo -e "${2}[${1}]${NC} ${3}"; }
info() { log "INFO" "$BLUE" "$1"; }
success() { log "OK" "$GREEN" "$1"; }
warn() { log "WARN" "$YELLOW" "$1"; }
error() { log "ERROR" "$RED" "$1"; }

# Error handling and cleanup
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        error "Build failed with exit code $exit_code"
        [ -d "$BUILD_DIR" ] && rm -rf "$BUILD_DIR"
    fi
    exit $exit_code
}
trap cleanup EXIT

# Check dependencies
check_deps() {
    local missing=()
    for cmd in jq cmake ninja zip; do
        command -v "$cmd" >/dev/null || missing+=("$cmd")
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        error "Missing dependencies: ${missing[*]}"
        error "Please install: sudo apt-get install ${missing[*]}"
        exit 1
    fi
}

# Read JSON configuration
read_json() {
    jq -r "$1 // \"$2\"" "$SETTINGS_FILE" 2>/dev/null
}

read_bool() {
    local value=$(read_json "$1" "false")
    [ "$value" = "true" ] && echo "true" || echo "false"
}

# Validate configuration
validate_config() {
    [ ! -f "$SETTINGS_FILE" ] && { error "Settings file not found: $SETTINGS_FILE"; exit 1; }
    jq empty "$SETTINGS_FILE" 2>/dev/null || { error "Invalid JSON in settings file"; exit 1; }
}

# Initialize build environment
init_build() {
    info "Initializing build environment..."
    rm -rf "$BUILD_DIR"
    mkdir -p "$MODULE_DIR" "$BUILD_DIR/temp"
    success "Build environment ready"
}

# Build C++ components for specific architecture
build_cpp_arch() {
    local arch="$1"
    local build_type="$2"
    local module_id=$(read_json '.build.module_properties.module_name' 'AuroraModule')
    
    info "Building C++ components for $arch..."
    
    cd "$PROJECT_ROOT/Core"
    rm -rf "build_$arch" && mkdir "build_$arch" && cd "build_$arch"
    
    # Configure CMake with architecture-specific settings and static linking
    cmake .. -G Ninja \
        -DCMAKE_TOOLCHAIN_FILE="$NDK_DIR/build/cmake/android.toolchain.cmake" \
        -DANDROID_ABI="$arch" \
        -DANDROID_PLATFORM=android-21 \
        -DCMAKE_BUILD_TYPE="$build_type" \
        -DBUILD_TESTING=OFF \
        -DCMAKE_CXX_FLAGS_RELEASE="-O3 -DNDEBUG -flto -static-libgcc -static-libstdc++" \
        -DCMAKE_C_FLAGS_RELEASE="-O3 -DNDEBUG -flto -static-libgcc" \
        -DCMAKE_EXE_LINKER_FLAGS="-static-libgcc -static-libstdc++" \
        -DANDROID_STL=c++_static
    
    # Build using cmake instead of make for better cross-platform compatibility
    cmake --build . --parallel --config "$build_type" --target logger_daemon logger_client filewatcher
    
    # Create bin directory
    mkdir -p "$MODULE_DIR/bin"
    
    # Copy binaries with module_id and architecture suffix
    [ -f "src/logger/logger_daemon" ] && cp "src/logger/logger_daemon" "$MODULE_DIR/bin/logger_daemon_${module_id}_${arch}"
    [ -f "src/logger/logger_client" ] && cp "src/logger/logger_client" "$MODULE_DIR/bin/logger_client_${module_id}_${arch}"
    [ -f "src/filewatcher/filewatcher" ] && cp "src/filewatcher/filewatcher" "$MODULE_DIR/bin/filewatcher_${module_id}_${arch}"
    
    # Strip debug symbols for smaller binaries
    find "$MODULE_DIR/bin/" -name "*_${module_id}_${arch}" -type f -executable -exec strip {} \; 2>/dev/null || true
    
    # Clean up cmake build directory
    cd "$PROJECT_ROOT/Core"
    rm -rf "build_$arch"
    
    success "C++ components built for $arch with suffix"
}

# Build C++ components
build_cpp() {
    local use_tools=$(read_json '.build.use_tools_form' '')
    local build_type=$(read_json '.build.build_type' 'Release')
    
    if [ "$use_tools" = "build" ] && [ -d "$PROJECT_ROOT/Core" ]; then
        info "Using Android NDK at: $NDK_DIR"
        if [ ! -d "$NDK_DIR" ]; then
            error "Android NDK not found at $NDK_DIR"
            error "Checked paths:"
            error "  - Environment ANDROID_NDK_ROOT: ${ANDROID_NDK_ROOT:-'not set'}"
            error "  - Local path: $PROJECT_ROOT/android-ndk"
            error "Please install Android NDK or set ANDROID_NDK_ROOT environment variable"
            exit 1
        fi
        
        # Build for all configured architectures
        local architectures=$(jq -r '.build.architectures[]?' "$SETTINGS_FILE" 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$//')
        if [ -z "$architectures" ]; then
            architectures="arm64-v8a x86_64"
        fi
        
        for arch in $architectures; do
            build_cpp_arch "$arch" "$build_type"
        done
        
        success "All C++ components built with architecture suffixes"
    fi
}

# Create META-INF structure
create_meta_inf() {
    if [ "$(read_bool '.module.META_INF_default')" = "false" ]; then
        info "Creating META-INF structure..."
        mkdir -p "$MODULE_DIR/META-INF/com/google/android"
        
        cat > "$MODULE_DIR/META-INF/com/google/android/update-binary" << 'EOF'
#!/sbin/sh
umask 022
ui_print() { echo "$1"; }
require_new_magisk() {
  ui_print "*******************************"
  ui_print " Please install Magisk v20.4+! "
  ui_print "*******************************"
  exit 1
}
OUTFD=$2
ZIPFILE=$3
mount /data 2>/dev/null
[ -f /data/adb/magisk/util_functions.sh ] || require_new_magisk
. /data/adb/magisk/util_functions.sh
[ $MAGISK_VER_CODE -lt 20400 ] && require_new_magisk
install_module
exit 0
EOF
        
        echo "#MAGISK" > "$MODULE_DIR/META-INF/com/google/android/updater-script"
        chmod +x "$MODULE_DIR/META-INF/com/google/android/update-binary"
        success "META-INF structure created"
    fi
}

# Get version with Git tag sync support
get_module_version() {
    local sync_with_tag=$(read_bool '.build.version_sync.sync_with_git_tag')
    local tag_prefix=$(read_json '.build.version_sync.tag_prefix' 'v')
    local fallback_version=$(read_json '.build.module_properties.module_version' '1.0.0')
    local config_version=$(read_json '.build.module_properties.module_version' '1.0.0')
    
    if [ "$sync_with_tag" = "true" ]; then
        # Try to get version from Git tag
        local git_tag=""
        if command -v git >/dev/null 2>&1 && [ -d "$PROJECT_ROOT/.git" ]; then
            # Get the latest tag that matches the prefix
            git_tag=$(git describe --tags --abbrev=0 --match="${tag_prefix}*" 2>/dev/null || echo "")
            
            if [ -n "$git_tag" ]; then
            local version=$(echo "$git_tag" | sed "s/^${tag_prefix}//")
                # Log to stderr to avoid contaminating the return value
                info "Using version from Git tag: $git_tag -> $version" >&2
                echo "$version"
                return
            else
                warn "No Git tag found with prefix '$tag_prefix', using fallback version: $fallback_version" >&2
                echo "$fallback_version"
                return
            fi
        else
            warn "Git not available or not in a Git repository, using fallback version: $fallback_version" >&2
            echo "$fallback_version"
            return
        fi
    else
        # Use version from configuration
        echo "$config_version"
    fi
}

# Create module.prop
create_module_prop() {
    info "Creating module.prop..."
    
    local name=$(read_json '.build.module_properties.module_name' 'AuroraModule')
    local version=$(get_module_version)
    local versioncode=$(date +"%Y%m%d")
    local author=$(read_json '.build.module_properties.module_author' 'Aurora')
    local description=$(read_json '.build.module_properties.module_description' 'Aurora Module')
    local update_json=$(read_json '.build.module_properties.updateJson' '')
    
    cat > "$MODULE_DIR/module.prop" << EOF
id=$name
name=$name
version=$version
versionCode=$versioncode
author=$author
description=$description
EOF
    
    [ -n "$update_json" ] && echo "updateJson=$update_json" >> "$MODULE_DIR/module.prop"
    success "module.prop created"
}

# Build WebUI
build_webui() {
    local webui_default=$(read_bool '.module.webui_default')
    local aurora_webui_build=$(read_bool '.build.Aurora_webui_build')
    
    if [ "$webui_default" = "false" ] && [ "$aurora_webui_build" = "true" ]; then
        info "Building WebUI..."
        
        [ ! -f "$PROJECT_ROOT/webui/package.json" ] && { warn "WebUI package.json not found, skipping"; return; }
        command -v npm >/dev/null || { error "npm not found"; return; }
        
        # Create temporary webui directory for building
        local temp_webui_dir="$BUILD_DIR/temp_webui"
        rm -rf "$temp_webui_dir"
        mkdir -p "$temp_webui_dir"
        
        # Copy webui source to temporary directory
        info "Copying WebUI source to temporary directory..."
        if command -v rsync >/dev/null 2>&1; then
            rsync -av --exclude='node_modules/' --exclude='dist/' "$PROJECT_ROOT/webui/" "$temp_webui_dir/"
        else
            cp -r "$PROJECT_ROOT/webui"/* "$temp_webui_dir/" 2>/dev/null || true
            rm -rf "$temp_webui_dir/node_modules" "$temp_webui_dir/dist" 2>/dev/null || true
        fi
        
        cd "$temp_webui_dir"
        
        # Perform text replacement in temporary directory
        perform_webui_text_replacement
        
        npm ci && npm run build
        
        mkdir -p "$MODULE_DIR/webroot"
        cp -r dist/* "$MODULE_DIR/webroot/"
        
        # Clean up temporary directory
        rm -rf "$temp_webui_dir"
        
        success "WebUI built and copied"
    fi
}

# Perform WebUI text replacement in temporary directory
perform_webui_text_replacement() {
    info "Performing WebUI text replacement in temporary directory..."
    
    # Read configuration from settings.json
    local github_update_repo=$(read_json '.build.Github_update_repo' '')
    local module_name=$(read_json '.build.module_properties.module_name' 'AuroraModule')
    local current_time_versioncode=$(date +"%y%m%d")
    
    # Check if Github_update_repo is set
    if [ "$github_update_repo" = "" ] || [ "$github_update_repo" = "your_name/your_repo" ]; then
        warn "Github_update_repo not properly configured in settings.json"
        warn "Please set Github_update_repo, example: Aurora-Nasa-1/ModuleWebUI"
        warn "Skipping text replacement"
        return
    fi
    
    info "Replacing text with:"
    info "  Github_update_repo: $github_update_repo"
    info "  Module ID: $module_name"
    info "  Module Name: $module_name"
    info "  Version Code: $current_time_versioncode"
    info "  Working directory: $(pwd)"
    
    # Replace version code in status.js
    if [ -f "src/pages/status.js" ]; then
        sed -i "s/20240503/${current_time_versioncode}/g" src/pages/status.js
        info "Updated version code in status.js"
    fi
    
    # Replace Github repo in status.js files
    find src -name "status.js" -exec sed -i "s/Aurora-Nasa-1\/AMMF/${github_update_repo//\//\\/}/g" {} \; 2>/dev/null || true
    
    # Replace module ID in all JS files
    find src -name "*.js" -exec sed -i "s/AMMF/${module_name}/g" {} \; 2>/dev/null || true
    
    # Replace module ID in index.html
    if [ -f "src/index.html" ]; then
        sed -i "s/AMMF/${module_name}/g" src/index.html
        info "Updated module ID in index.html"
    elif [ -f "index.html" ]; then
        sed -i "s/AMMF/${module_name}/g" index.html
        info "Updated module ID in index.html"
    fi
    
    # Replace module name in translation files
    if [ -d "src/translations" ]; then
        find src/translations -name "*.json" -exec sed -i "s/AMMF/${module_name}/g" {} \; 2>/dev/null || true
        info "Updated module name in translation files"
    fi
    
    success "WebUI text replacement completed (source files unchanged)"
}

# Create customize.sh
create_customize_sh() {
    info "Creating customize.sh..."
    
    local add_aurora=$(read_bool '.build.script.add_Aurora_function_for_script')
    local add_log=$(read_bool '.build.script.add_log_support_for_script')
    local build_type=$(read_json '.build.build_type' 'Release')
    local module_id=$(read_json '.build.module_properties.module_name' 'AuroraModule')
    local package_mode=$(read_json '.build.package_mode' 'single_zip')
    local default_SCRIPT=$(read_bool '.module.install_script_default' 'false')
    if [ "$default_SCRIPT" = "true" ] && [ -f "$PROJECT_ROOT/module/customize.sh" ]; then
    cp "$PROJECT_ROOT/module/customize.sh" "$MODULE_DIR/DEFAULT_INSTALL.sh"
    fi
    cat > "$MODULE_DIR/customize.sh" << EOF
#!/system/bin/sh
# Aurora Module Installation Script - Simplified Architecture Handling

BUILD_TYPE="$build_type"
MODULE_ID="$module_id"
PACKAGE_MODE="$package_mode"

# Convert Magisk ARCH to build architecture format
convert_arch() {
    case "\$ARCH" in
        arm64) echo "arm64-v8a" ;;
        arm) echo "armeabi-v7a" ;;
        x64) echo "x86_64" ;;
        x86) echo "x86" ;;
        *) echo "\$ARCH" ;; # fallback
    esac
}

BUILD_ARCH=\$(convert_arch)

ui_print "Installing Aurora Module..."
ui_print "Build Type: \$BUILD_TYPE"
ui_print "Device Architecture: \$ARCH (\$BUILD_ARCH)"
ui_print "Package Mode: \$PACKAGE_MODE"

# Set basic permissions
set_perm_recursive \$MODPATH 0 0 0755 0644

# Handle binary installation with simplified architecture processing
if [ -d "\$MODPATH/bin" ]; then
    # Check if this is a multi-architecture package
    local has_suffixed_binaries=false
    for binary in \$MODPATH/bin/*_\${MODULE_ID}_*; do
        if [ -f "\$binary" ]; then
            has_suffixed_binaries=true
            break
        fi
    done
    
    if [ "\$has_suffixed_binaries" = "true" ]; then
        ui_print "Processing multi-architecture binaries..."
        
        # Remove binaries that don't match current architecture
        for binary in \$MODPATH/bin/*_\${MODULE_ID}_*; do
            if [ -f "\$binary" ]; then
                local binary_name=\$(basename "\$binary")
                if echo "\$binary_name" | grep -q "_\${MODULE_ID}_\${BUILD_ARCH}\$"; then
                    # This binary matches current architecture - rename without suffix
                    local clean_name=\$(echo "\$binary_name" | sed "s/_\${MODULE_ID}_\${BUILD_ARCH}\$//")
                    mv "\$binary" "\$MODPATH/bin/\$clean_name"
                    ui_print "Configured \$clean_name for \$BUILD_ARCH"
                else
                    # This binary is for different architecture - remove it
                    rm -f "\$binary"
                fi
            fi
        done
        ui_print "Multi-architecture binaries processed successfully"
    else
        ui_print "Single-architecture package detected, no cleanup needed"
    fi
    
    # Set permissions for remaining binaries
    set_perm_recursive \$MODPATH/bin 0 0 0755 0755
else
    ui_print "No binary directory found, skipping binary setup"
fi

ui_print "Aurora Module installed successfully!"
EOF
    
    # Add script imports
    if [ "$add_log" = "true" ]; then
        sed -i '3i\. $MODPATH/Logsystem.sh' "$MODULE_DIR/customize.sh"
        [ -f "$PROJECT_ROOT/build/Logsystem.sh" ] && cp "$PROJECT_ROOT/build/Logsystem.sh" "$MODULE_DIR/"
    fi
    
    if [ "$add_aurora" = "true" ]; then
        sed -i '3i\. $MODPATH/AuroraCore.sh' "$MODULE_DIR/customize.sh"
        [ -f "$PROJECT_ROOT/build/AuroraCore.sh" ] && cp "$PROJECT_ROOT/build/AuroraCore.sh" "$MODULE_DIR/"
    fi
    if [ "$default_SCRIPT" = "true" ] && [ -f "$MODULE_DIR/DEFAULT_INSTALL.sh" ]; then
        echo "source $MODULE_DIR/DEFAULT_INSTALL.sh" >> "$MODULE_DIR/customize.sh"
    fi
    chmod +x "$MODULE_DIR/customize.sh"
    success "customize.sh created"
}

# Run custom script
run_custom_script() {
    if [ "$(read_bool '.build.custom_build_script')" = "true" ]; then
        local script=$(read_json '.build.build_script.script_path' 'custom_build_script.sh')
        if [ -f "$PROJECT_ROOT/$script" ]; then
            info "Running custom script: $script"
            cd "$PROJECT_ROOT" && bash "$script"
            success "Custom script completed"
        else
            warn "Custom script not found: $script"
        fi
    fi
}

# Package module
package_module() {
    info "Packaging Magisk module..."
    
    local name=$(read_json '.build.module_properties.module_name' 'AuroraModule')
    local version=$(get_module_version)
    local package_mode=$(read_json '.build.package_mode' 'single_zip')
    cp -r "$PROJECT_ROOT/module/"* "$MODULE_DIR/"
    rm "$MODULE_DIR/settings.json"
    case "$package_mode" in
        "single_zip")
            # Single zip with all architectures (with suffixes)
            local output="${name}-${version}-multi-arch.zip"
            cd "$MODULE_DIR"
            zip -r "$BUILD_DIR/$output" . -x "*.DS_Store" "*Thumbs.db"
            success "Multi-architecture module packaged as: $output"
            ;;
        "separate_zip")
            # Separate zip for each architecture (single-arch packages)
            local architectures=$(jq -r '.build.architectures[]?' "$SETTINGS_FILE" 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$//')
            if [ -z "$architectures" ]; then
                architectures="arm64-v8a x86_64"
            fi
            
            for arch in $architectures; do
                info "Packaging $arch architecture..."
                local arch_output="${name}-${version}-${arch}.zip"
                
                # Create temporary directory for this architecture
                local temp_dir="$BUILD_DIR/temp_$arch"
                rm -rf "$temp_dir" && mkdir -p "$temp_dir"
                
                # Copy all module files except bin directory
                if command -v rsync >/dev/null 2>&1; then
                    rsync -av --exclude='bin/' "$MODULE_DIR/" "$temp_dir/"
                else
                    # Fallback to cp if rsync is not available
                    cp -r "$MODULE_DIR"/* "$temp_dir/" 2>/dev/null || true
                    rm -rf "$temp_dir/bin" 2>/dev/null || true
                fi
                
                # Create bin directory and copy only this architecture's binaries without suffix
                mkdir -p "$temp_dir/bin"
                for binary in "$MODULE_DIR/bin"/*_${name}_${arch}; do
                    if [ -f "$binary" ]; then
                        local binary_name=$(basename "$binary")
                        local clean_name=$(echo "$binary_name" | sed "s/_${name}_${arch}$//")
                        cp "$binary" "$temp_dir/bin/$clean_name"
                    fi
                done
                
                # Update customize.sh to indicate single-arch package
                sed -i 's/PACKAGE_MODE="[^"]*"/PACKAGE_MODE="single_arch"/' "$temp_dir/customize.sh" 2>/dev/null || true
                
                # Package this architecture
                cd "$temp_dir"
                zip -r "$BUILD_DIR/$arch_output" . -x "*.DS_Store" "*Thumbs.db"
                
                success "$arch module packaged as: $arch_output"
                rm -rf "$temp_dir"
            done
            ;;
        *)
            # Default to single zip for any other mode
            local output="${name}-${version}.zip"
            cd "$MODULE_DIR"
            zip -r "$BUILD_DIR/$output" . -x "*.DS_Store" "*Thumbs.db"
            success "Module packaged as: $output"
            ;;
    esac
    
    info "Output location: $BUILD_DIR/"
    ls -la "$BUILD_DIR/"*.zip 2>/dev/null || true
}

# Main build process
main_build() {
    info "Starting Aurora Module build process..."
    
    init_build
    build_cpp
    create_meta_inf
    create_module_prop
    build_webui
    create_customize_sh
    package_module
    run_custom_script
    
    success "Aurora Module build completed successfully!"
}

# Show configuration
show_config() {
    info "Aurora Module Configuration:"
    echo "Module Build: $(read_bool '.build_module')"
    echo "WebUI Build: $(read_bool '.build.Aurora_webui_build')"
    echo "Build Type: $(read_json '.build.build_type' 'Release')"
    echo "Package Mode: $(read_json '.build.package_mode' 'single_zip')"
    
    local architectures=$(jq -r '.build.architectures[]?' "$SETTINGS_FILE" 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$//')
    if [ -n "$architectures" ]; then
        echo "Target Architectures: $architectures"
    else
        echo "Target Architectures: arm64-v8a x86_64 (default)"
    fi
    
    echo "Package Modes:"
    echo "  - single_zip: Multi-arch package with runtime cleanup"
    echo "  - separate_zip: Single-arch packages (no cleanup needed)"
    echo "Architecture Handling: Simplified (Magisk ARCH auto-conversion)"
    echo "Module Name: $(read_json '.build.module_properties.module_name' 'AuroraModule')"
    echo "Version: $(read_json '.build.module_properties.module_version' '1.0.0')"
    echo
}

# Main function
main() {
    case "${1:-}" in
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "  -a, --auto    Auto mode (no confirmation)"
            echo "  -c, --config  Show config only"
            echo "  -h, --help    Show help"
            exit 0
            ;;
        -c|--config)
            validate_config
            show_config
            exit 0
            ;;
    esac
    
    info "Aurora Module Build Script"
    check_deps
    validate_config
    show_config
    
    if [ "$(read_bool '.build_module')" != "true" ]; then
        info "Build disabled in configuration"
        exit 0
    fi
    
    # Build confirmation
    if [ "$1" != "-a" ] && [ "$1" != "--auto" ]; then
        printf "Proceed with build? (y/N): "
        read -r response
        case "$response" in
            [yY]*) ;;
            *) info "Build cancelled"; exit 0 ;;
        esac
    fi
    
    main_build
}

# Execute main function
main "$@"

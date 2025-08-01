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
    
    local validate_enabled=$(read_bool '.build.advanced.validate_config')
    if [ "$validate_enabled" = "true" ]; then
        info "Performing advanced configuration validation..."
        
        # Validate required fields
        local module_name=$(read_json '.build.module_properties.module_name' '')
        if [ -z "$module_name" ] || [ "$module_name" = "YourModuleID" ]; then
            warn "module_name not properly configured, using default"
        fi
        
        local github_repo=$(read_json '.build.Github_update_repo' '')
        if [ "$github_repo" = "your_name/your_repo" ] || [ -z "$github_repo" ]; then
            warn "Github_update_repo not configured - some features may not work"
        fi
        
        # Validate architectures
        local architectures=$(jq -r '.build.architectures[]?' "$SETTINGS_FILE" 2>/dev/null)
        if [ -z "$architectures" ]; then
            warn "No architectures specified, using defaults: arm64-v8a x86_64"
        fi
        
        # Validate use_tools_form
        local use_tools=$(read_json '.build.use_tools_form' '')
        if [ "$use_tools" != "build" ] && [ "$use_tools" != "release" ]; then
            error "Invalid use_tools_form: $use_tools (must be 'build' or 'release')"
            exit 1
        fi
        
        # Validate WebUI overlay path if specified
        local overlay_path=$(read_json '.build.webui.webui_overlay_src_path' '')
        if [ -n "$overlay_path" ] && [ ! -d "$PROJECT_ROOT/$overlay_path" ]; then
            warn "WebUI overlay path does not exist: $overlay_path"
        fi
        
        success "Configuration validation completed"
    fi
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
    local debug_logging=$(read_bool '.build.advanced.enable_debug_logging')
    local strip_binaries=$(read_bool '.build.advanced.strip_binaries')
    
    info "Building C++ components for $arch..."
    if [ "$debug_logging" = "true" ]; then
        info "Debug logging enabled for build"
    fi
    
    cd "$PROJECT_ROOT/Core"
    rm -rf "build_$arch" && mkdir "build_$arch" && cd "build_$arch"
    
    # Prepare CMake flags based on configuration
    local cmake_cxx_flags="-O3 -DNDEBUG -flto -static-libgcc -static-libstdc++"
    local cmake_c_flags="-O3 -DNDEBUG -flto -static-libgcc"
    
    if [ "$debug_logging" = "true" ]; then
        cmake_cxx_flags="$cmake_cxx_flags -DENABLE_DEBUG_LOGGING=1"
        cmake_c_flags="$cmake_c_flags -DENABLE_DEBUG_LOGGING=1"
        info "Debug logging flags added to build"
    fi
    
    # Configure CMake with architecture-specific settings and static linking
    cmake .. -G Ninja \
        -DCMAKE_TOOLCHAIN_FILE="$NDK_DIR/build/cmake/android.toolchain.cmake" \
        -DANDROID_ABI="$arch" \
        -DANDROID_PLATFORM=android-21 \
        -DCMAKE_BUILD_TYPE="$build_type" \
        -DBUILD_TESTING=OFF \
        -DCMAKE_CXX_FLAGS_RELEASE="$cmake_cxx_flags" \
        -DCMAKE_C_FLAGS_RELEASE="$cmake_c_flags" \
        -DCMAKE_EXE_LINKER_FLAGS="-static-libgcc -static-libstdc++" \
        -DANDROID_STL=c++_static
    
    # Build using cmake instead of make for better cross-platform compatibility
    if [ "$debug_logging" = "true" ]; then
        cmake --build . --parallel --config "$build_type" --target filewatcher --verbose
    else
        cmake --build . --parallel --config "$build_type" --target filewatcher
    fi
    
    # Create bin directory
    mkdir -p "$MODULE_DIR/bin"
    
    # Copy binaries with module_id and architecture suffix
    [ -f "src/filewatcher/filewatcher" ] && cp "src/filewatcher/filewatcher" "$MODULE_DIR/bin/filewatcher_${module_id}_${arch}"
    
    # Strip debug symbols for smaller binaries (if enabled)
    if [ "$strip_binaries" = "true" ]; then
        info "Stripping debug symbols from binaries..."
        find "$MODULE_DIR/bin/" -name "*_${module_id}_${arch}" -type f -executable -exec strip {} \; 2>/dev/null || true
        success "Debug symbols stripped"
    else
        info "Keeping debug symbols in binaries"
    fi
    
    # Clean up cmake build directory
    cd "$PROJECT_ROOT/Core"
    rm -rf "build_$arch"
    
    success "C++ components built for $arch with suffix"
}

# Download tools from release
download_tools_from_release() {
    local github_repo=$(read_json '.build.Github_update_repo' '')
    local module_name=$(read_json '.build.module_properties.module_name' 'AuroraModule')
    
    if [ -z "$github_repo" ] || [ "$github_repo" = "your_name/your_repo" ]; then
        error "Github_update_repo not configured for release download"
        error "Please set Github_update_repo in settings.json"
        return 1
    fi
    
    info "Downloading tools from GitHub release: $github_repo"
    
    # Create tools directory
    local tools_dir="$BUILD_DIR/tools"
    mkdir -p "$tools_dir"
    
    # Get latest release info
    local release_url="https://api.github.com/repos/$github_repo/releases/latest"
    local release_info=$(curl -s "$release_url" 2>/dev/null)
    
    if [ -z "$release_info" ] || echo "$release_info" | grep -q '"message".*"Not Found"'; then
        error "Failed to fetch release information from: $release_url"
        error "Please check if the repository exists and has releases"
        return 1
    fi
    
    # Get architectures to download
    local architectures=$(jq -r '.build.architectures[]?' "$SETTINGS_FILE" 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$//')
    if [ -z "$architectures" ]; then
        architectures="arm64-v8a x86_64"
    fi
    
    # Download binaries for each architecture
    for arch in $architectures; do
        info "Downloading tools for architecture: $arch"
        
        # Download filewatcher
        local watcher_url=$(echo "$release_info" | jq -r ".assets[] | select(.name | contains(\"filewatcher\") and contains(\"$arch\")) | .browser_download_url" | head -1)
        if [ -n "$watcher_url" ] && [ "$watcher_url" != "null" ]; then
            curl -L -o "$tools_dir/filewatcher_${module_name}_${arch}" "$watcher_url"
            chmod +x "$tools_dir/filewatcher_${module_name}_${arch}"
            info "Downloaded filewatcher for $arch"
        fi
    done
    
    # Copy tools to module bin directory
    mkdir -p "$MODULE_DIR/bin"
    cp "$tools_dir"/* "$MODULE_DIR/bin/" 2>/dev/null || true
    
    success "Tools downloaded from release successfully"
}

# Build C++ components
build_cpp() {
    local use_tools=$(read_json '.build.use_tools_form' '')
    local build_type=$(read_json '.build.build_type' 'Release')
    
    case "$use_tools" in
        "build")
            if [ -d "$PROJECT_ROOT/Core" ]; then
                info "Building C++ components from source..."
                # Check NDK only if not in script-only mode
                local skip_cpp=$(read_bool '.build.advanced.skip_cpp_build')
                if [ "$skip_cpp" != "true" ]; then
                    info "Using Android NDK at: $NDK_DIR"
                    if [ ! -d "$NDK_DIR" ]; then
                        error "Android NDK not found at $NDK_DIR"
                        error "Checked paths:"
                        error "  - Environment ANDROID_NDK_ROOT: ${ANDROID_NDK_ROOT:-'not set'}"
                        error "  - Local path: $PROJECT_ROOT/android-ndk"
                        error "Please install Android NDK or set ANDROID_NDK_ROOT environment variable"
                        exit 1
                    fi
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
            else
                warn "Core directory not found, skipping C++ build"
            fi
            ;;
        "release")
            info "Using tools from GitHub release..."
            download_tools_from_release || {
                error "Failed to download tools from release"
                error "Falling back to build mode if Core directory exists"
                if [ -d "$PROJECT_ROOT/Core" ]; then
                    warn "Attempting to build from source as fallback"
                    # Temporarily change use_tools to build and retry
                    local temp_use_tools="build"
                    build_cpp
                else
                    error "No fallback available - Core directory not found"
                    exit 1
                fi
            }
            ;;
        "")
            warn "use_tools_form not specified, skipping C++ components"
            ;;
        *)
            error "Invalid use_tools_form: $use_tools (valid options: build, release)"
            exit 1
            ;;
    esac
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
                # Remove prefix from tag to get version
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
    local rewrite_properties=$(read_bool '.build.rewrite_module_properties')
    
    if [ "$rewrite_properties" = "true" ]; then
        info "Creating module.prop from settings..."
        
        local name=$(read_json '.build.module_properties.module_name' 'AuroraModule')
        local version=$(get_module_version)
        local versioncode=$(date +"%Y%m%d")
        local author=$(read_json '.build.module_properties.module_author' 'Aurora')
        local description=$(read_json '.build.module_properties.module_description' 'Aurora Module')
        local update_json=$(read_json '.build.module_properties.updateJson' '')
        
        # Generate version code from Git tag if sync is enabled
        local sync_with_tag=$(read_bool '.build.version_sync.sync_with_git_tag')
        if [ "$sync_with_tag" = "true" ]; then
            if command -v git >/dev/null 2>&1 && [ -d "$PROJECT_ROOT/.git" ]; then
                local git_commit_count=$(git rev-list --count HEAD 2>/dev/null || echo "0")
                local git_commit_short=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
                versioncode="$git_commit_count"
                info "Using Git-based version code: $versioncode (commit: $git_commit_short)"
            fi
        fi
        
        cat > "$MODULE_DIR/module.prop" << EOF
id=$name
name=$name
version=$version
versionCode=$versioncode
author=$author
description=$description
EOF
        
        [ -n "$update_json" ] && echo "updateJson=$update_json" >> "$MODULE_DIR/module.prop"
        success "module.prop created from settings"
    else
        info "Using existing module.prop..."
        if [ -f "$PROJECT_ROOT/module/module.prop" ]; then
            cp "$PROJECT_ROOT/module/module.prop" "$MODULE_DIR/module.prop"
            success "Existing module.prop copied"
        else
            warn "No existing module.prop found, creating default one"
            # Create a minimal default module.prop
            local name=$(read_json '.build.module_properties.module_name' 'AuroraModule')
            cat > "$MODULE_DIR/module.prop" << EOF
id=$name
name=$name
version=1.0.0
versionCode=1
author=Unknown
description=Aurora Module
EOF
            warn "Default module.prop created - consider enabling rewrite_module_properties"
        fi
    fi
}

# Build WebUI
build_webui() {
    local webui_default=$(read_bool '.module.webui_default')
    local aurora_webui_build=$(read_bool '.build.Aurora_webui_build')
    
    if [ "$webui_default" = "false" ] && [ "$aurora_webui_build" = "true" ]; then
        info "Building WebUI with new architecture..."
        
        [ ! -f "$PROJECT_ROOT/webui/package.json" ] && { warn "WebUI package.json not found, skipping"; return; }
        command -v npm >/dev/null || { error "npm not found"; return; }
        
        # Read WebUI configuration
        local webui_overlay_src=$(read_json '.build.webui.webui_overlay_src_path' '')
        local webui_output_path=$(read_json '.build.webui.webui_build_output_path' 'webroot')
        local use_tools_form=$(read_json '.build.use_tools_form' 'build')
        
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
        
        # Apply overlay if specified
        if [ -n "$webui_overlay_src" ] && [ -d "$PROJECT_ROOT/$webui_overlay_src" ]; then
            info "Applying WebUI overlay from: $webui_overlay_src"
            if command -v rsync >/dev/null 2>&1; then
                rsync -av "$PROJECT_ROOT/$webui_overlay_src/" "$temp_webui_dir/"
            else
                cp -r "$PROJECT_ROOT/$webui_overlay_src"/* "$temp_webui_dir/" 2>/dev/null || true
            fi
            success "WebUI overlay applied"
        fi
        
        cd "$temp_webui_dir"
        
        # Perform text replacement in temporary directory
        perform_webui_text_replacement
        
        # Install dependencies and build
        info "Installing WebUI dependencies..."
        npm ci || { error "Failed to install WebUI dependencies"; return 1; }
        
        info "Building WebUI..."
        # Use the new build script approach
        export MODID=$(read_json '.build.module_properties.module_name' 'AuroraModule')
        if [ -f "build.sh" ]; then
            chmod +x build.sh
            bash build.sh
        else
            # Fallback to direct npm build
            find src -name "*.js" -exec sed -i "s/ModuleWebUI/${MODID}/g" {} \; 2>/dev/null || true
            [ -f "index.html" ] && sed -i "s/ModuleWebUI/${MODID}/g" index.html
            npm run build:prod || npm run build
        fi
        
        # Copy built files to module directory
        local output_dir="$MODULE_DIR/$webui_output_path"
        mkdir -p "$output_dir"
        
        if [ -d "dist" ]; then
            cp -r dist/* "$output_dir/"
            success "WebUI built and copied to: $webui_output_path"
        else
            error "WebUI build output not found (dist directory missing)"
            return 1
        fi
        
        # Clean up temporary directory
        rm -rf "$temp_webui_dir"
        
        success "WebUI build completed successfully"
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
    
    # Replace module ID in all JS files
    find src -name "*.js" -exec sed -i "s/ModuleWebUI/${module_name}/g" {} \; 2>/dev/null || true
    
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
    local skip_cpp=$(read_bool '.build.advanced.skip_cpp_build')
    
    if [ "$default_SCRIPT" = "true" ] && [ -f "$PROJECT_ROOT/module/customize.sh" ]; then
    cp "$PROJECT_ROOT/module/customize.sh" "$MODULE_DIR/DEFAULT_INSTALL.sh"
    fi
    cat > "$MODULE_DIR/customize.sh" << EOF
#!/system/bin/sh
# Aurora Module Installation Script - Simplified Architecture Handling

BUILD_TYPE="$build_type"
MODULE_ID="$module_id"
PACKAGE_MODE="$package_mode"
SKIP_CPP="$skip_cpp"

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

# Handle binary installation with simplified architecture processing (MUST be first)
if [ "\$SKIP_CPP" != "true" ] && [ -d "\$MODPATH/bin" ]; then
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
elif [ "\$SKIP_CPP" = "true" ]; then
    ui_print "Script-only module, skipping binary processing"
else
    ui_print "No binary directory found, skipping binary setup"
fi

EOF
    echo 'ui_print "loading"' >> "$MODULE_DIR/customize.sh"
    # Add script imports (after binary processing)
    if [ "$add_log" = "true" ]; then
        sed -i '/^ui_print "loading"/i\. $MODPATH/log_b.sh' "$MODULE_DIR/customize.sh"
        [ -f "$PROJECT_ROOT/build/log_b.sh" ] && cp "$PROJECT_ROOT/build/log_b.sh" "$MODULE_DIR/"
    fi
    if [ "$add_aurora" = "true" ]; then
        sed -i '/^ui_print "loading"/i\. $MODPATH/AuroraCore.sh' "$MODULE_DIR/customize.sh"
        [ -f "$PROJECT_ROOT/build/AuroraCore.sh" ] && cp "$PROJECT_ROOT/build/AuroraCore.sh" "$MODULE_DIR/"
    fi
    if [ "$default_SCRIPT" = "true" ] && [ -f "$MODULE_DIR/DEFAULT_INSTALL.sh" ]; then
        echo "source $MODULE_DIR/DEFAULT_INSTALL.sh" >> "$MODULE_DIR/customize.sh"
        echo "rm -f $MODULE_DIR/DEFAULT_INSTALL.sh" >> "$MODULE_DIR/customize.sh"
    fi
    chmod +x "$MODULE_DIR/customize.sh"

echo "set_perm_recursive \$MODPATH 0 0 0755 0644" >> "$MODULE_DIR/customize.sh"

echo 'ui_print "Aurora Module installed successfully!"' >> "$MODULE_DIR/customize.sh"
echo 'cleanup_on_exit' >> "$MODULE_DIR/customize.sh"
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
    cp -r "$PROJECT_ROOT/module/"* "$MODULE_DIR/"
    rm "$MODULE_DIR/settings.json"
    local name=$(read_json '.build.module_properties.module_name' 'AuroraModule')
    local version=$(get_module_version)
    local package_mode=$(read_json '.build.package_mode' 'single_zip')
    local compress_resources=$(read_bool '.build.advanced.compress_resources')
    local skip_cpp=$(read_bool '.build.advanced.skip_cpp_build')
    
    # Force single_zip mode for script-only builds
    if [ "$skip_cpp" = "true" ]; then
        package_mode="single_zip"
        info "Script-only mode: using single package (no architecture handling needed)"
    fi
    
    # Prepare compression options
    local zip_options="-r"
    if [ "$compress_resources" = "true" ]; then
        zip_options="$zip_options -9"  # Maximum compression
        info "Using maximum compression for resources"
    else
        zip_options="$zip_options -6"  # Standard compression
        info "Using standard compression"
    fi
    
    case "$package_mode" in
        "single_zip")
            # Single zip with all architectures (with suffixes)
            local output="${name}-${version}-multi-arch.zip"
            cd "$MODULE_DIR"
            zip $zip_options "$BUILD_DIR/$output" . -x "*.DS_Store" "*Thumbs.db"
            
            # Show package size info
            if [ -f "$BUILD_DIR/$output" ]; then
                local size=$(du -h "$BUILD_DIR/$output" | cut -f1)
                success "Multi-architecture module packaged as: $output ($size)"
            fi
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
                zip $zip_options "$BUILD_DIR/$arch_output" . -x "*.DS_Store" "*Thumbs.db"
                
                # Show package size info
                if [ -f "$BUILD_DIR/$arch_output" ]; then
                    local size=$(du -h "$BUILD_DIR/$arch_output" | cut -f1)
                    success "$arch module packaged as: $arch_output ($size)"
                else
                    success "$arch module packaged as: $arch_output"
                fi
                rm -rf "$temp_dir"
            done
            ;;
        *)
            # Default to single zip for any other mode
            local output="${name}-${version}.zip"
            cd "$MODULE_DIR"
            zip $zip_options "$BUILD_DIR/$output" . -x "*.DS_Store" "*Thumbs.db"
            
            # Show package size info
            if [ -f "$BUILD_DIR/$output" ]; then
                local size=$(du -h "$BUILD_DIR/$output" | cut -f1)
                success "Module packaged as: $output ($size)"
            else
                success "Module packaged as: $output"
            fi
            ;;
    esac
    
    info "Output location: $BUILD_DIR/"
    ls -la "$BUILD_DIR/"*.zip 2>/dev/null || true
}

# Main build process
main_build() {
    info "Starting Aurora Module build process..."
    init_build
    
    # Check if C++ build should be skipped
    local skip_cpp=$(read_bool '.build.advanced.skip_cpp_build')
    if [ "$skip_cpp" = "true" ]; then
        info "Skipping C++ build (script-only mode enabled)"
        info "Building script-only module package..."
    else
        build_cpp
    fi
    
    create_meta_inf
    create_module_prop
    build_webui
    create_customize_sh
    package_module
    run_custom_script
    
    if [ "$skip_cpp" = "true" ]; then
        success "Script-only Aurora Module build completed successfully!"
    else
        success "Aurora Module build completed successfully!"
    fi
}

# Development WebUI preview with live overlay processing
dev_webui_preview() {
    info "Starting WebUI development preview mode..."
    
    # Check if WebUI is enabled
    local aurora_webui_build=$(read_bool '.build.Aurora_webui_build')
    if [ "$aurora_webui_build" != "true" ]; then
        error "WebUI build is disabled in configuration"
        error "Please set 'Aurora_webui_build' to true in settings.json"
        exit 1
    fi
    
    # Check dependencies
    command -v npm >/dev/null || { error "npm not found, please install Node.js"; exit 1; }
    
    # Check for file watching capability (Windows/Linux compatible)
    local file_watcher_available=false
    if command -v inotifywait >/dev/null 2>&1; then
        file_watcher_available=true
        info "Using inotifywait for file watching"
    elif command -v fswatch >/dev/null 2>&1; then
        file_watcher_available=true
        info "Using fswatch for file watching"
    else
        warn "No file watcher found (inotifywait/fswatch), file watching disabled"
        warn "Install inotify-tools (Linux) or fswatch (macOS/Windows) for live overlay updates"
    fi
    
    # Check WebUI directory
    if [ ! -f "$PROJECT_ROOT/webui/package.json" ]; then
        error "WebUI package.json not found at $PROJECT_ROOT/webui/"
        exit 1
    fi
    
    # Read WebUI configuration
    local webui_overlay_src=$(read_json '.build.webui.webui_overlay_src_path' '')
    local temp_webui_dir="$BUILD_DIR/dev_webui"
    
    info "Setting up development environment..."
    
    # Create development directory
    rm -rf "$temp_webui_dir"
    mkdir -p "$temp_webui_dir"
    
    # Copy webui source to development directory
    info "Copying WebUI source to development directory..."
    if command -v rsync >/dev/null 2>&1; then
        rsync -av --exclude='node_modules/' --exclude='dist/' "$PROJECT_ROOT/webui/" "$temp_webui_dir/"
    else
        cp -r "$PROJECT_ROOT/webui"/* "$temp_webui_dir/" 2>/dev/null || true
        rm -rf "$temp_webui_dir/node_modules" "$temp_webui_dir/dist" 2>/dev/null || true
    fi
    
    # Apply initial overlay if specified
    if [ -n "$webui_overlay_src" ] && [ -d "$PROJECT_ROOT/$webui_overlay_src" ]; then
        info "Applying initial WebUI overlay from: $webui_overlay_src"
        apply_overlay_to_dev "$PROJECT_ROOT/$webui_overlay_src" "$temp_webui_dir"
        success "Initial WebUI overlay applied"
    fi
    
    cd "$temp_webui_dir"
    
    # Perform initial text replacement
    perform_webui_text_replacement
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        info "Installing WebUI dependencies..."
        npm ci || { error "Failed to install WebUI dependencies"; exit 1; }
    fi
    
    # Start file watcher in background if available
    if [ "$file_watcher_available" = "true" ] && [ -n "$webui_overlay_src" ] && [ -d "$PROJECT_ROOT/$webui_overlay_src" ]; then
        info "Starting file watcher for overlay changes..."
        start_overlay_watcher "$PROJECT_ROOT/$webui_overlay_src" "$temp_webui_dir" &
        WATCHER_PID=$!
        
        # Setup cleanup trap
        cleanup_dev() {
            info "Cleaning up development environment..."
            [ -n "$WATCHER_PID" ] && kill $WATCHER_PID 2>/dev/null || true
            [ -n "$DEV_SERVER_PID" ] && kill $DEV_SERVER_PID 2>/dev/null || true
            rm -rf "$temp_webui_dir"
            exit 0
        }
        trap cleanup_dev INT TERM EXIT
    fi
    
    # Set module ID for development
    export MODID=$(read_json '.build.module_properties.module_name' 'AuroraModule')
    
    info "Starting development server..."
    info "Module ID: $MODID"
    info "Development directory: $temp_webui_dir"
    if [ -n "$webui_overlay_src" ]; then
        info "Overlay source: $PROJECT_ROOT/$webui_overlay_src"
        info "File watcher: $([ "$file_watcher_available" = "true" ] && echo 'Active' || echo 'Disabled')"
    fi
    info "Press Ctrl+C to stop the development server"
    echo
    
    # Start development server (non-blocking)
    info "Starting Vite development server in background..."
    npm run dev &
    DEV_SERVER_PID=$!
    
    # Wait for server to start
    sleep 3
    
    # Check if server started successfully
    if kill -0 $DEV_SERVER_PID 2>/dev/null; then
        success "Development server started successfully (PID: $DEV_SERVER_PID)"
        info "Server should be available at: http://localhost:5173"
        info "Press Ctrl+C to stop all services"
        
        # Keep script running and handle cleanup
        wait_for_interrupt() {
            while true; do
                sleep 1
                # Check if dev server is still running
                if ! kill -0 $DEV_SERVER_PID 2>/dev/null; then
                    warn "Development server stopped unexpectedly"
                    break
                fi
            done
        }
        
        wait_for_interrupt
    else
        error "Failed to start development server"
        exit 1
    fi
}

# Apply overlay to development directory
apply_overlay_to_dev() {
    local overlay_src="$1"
    local target_dir="$2"
    
    if command -v rsync >/dev/null 2>&1; then
        rsync -av "$overlay_src/" "$target_dir/"
    else
        cp -r "$overlay_src"/* "$target_dir/" 2>/dev/null || true
    fi
}

# Start overlay file watcher
start_overlay_watcher() {
    local overlay_src="$1"
    local target_dir="$2"
    
    info "File watcher monitoring: $overlay_src"
    
    if command -v inotifywait >/dev/null 2>&1; then
        # Use inotifywait (Linux)
        inotifywait -m -r -e modify,create,delete,move "$overlay_src" --format '%w%f %e' |
        while read file event; do
            # Skip temporary files and hidden files
            case "$(basename "$file")" in
                .*|*~|*.tmp|*.swp) continue ;;
            esac
            
            info "Overlay file changed: $file ($event)"
            
            # Apply overlay changes
            apply_overlay_to_dev "$overlay_src" "$target_dir"
            
            # Perform text replacement after overlay update
            cd "$target_dir"
            perform_webui_text_replacement
            
            success "Overlay updated and text replacement applied"
        done
    elif command -v fswatch >/dev/null 2>&1; then
        # Use fswatch (macOS/Windows)
        fswatch -o -r "$overlay_src" |
        while read num_changes; do
            info "Overlay files changed ($num_changes changes detected)"
            
            # Apply overlay changes
            apply_overlay_to_dev "$overlay_src" "$target_dir"
            
            # Perform text replacement after overlay update
            cd "$target_dir"
            perform_webui_text_replacement
            
            success "Overlay updated and text replacement applied"
        done
    else
        warn "No file watcher available, monitoring disabled"
    fi
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
            echo "  -d, --dev     Development mode with live WebUI preview"
            echo "  -h, --help    Show help"
            exit 0
            ;;
        -c|--config)
            validate_config
            show_config
            exit 0
            ;;
        -d|--dev)
            validate_config
            dev_webui_preview
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

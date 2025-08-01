class DaxequalizerPage {
  constructor() {
    this.data = {
      profiles: [],
      currentProfile: null,
      presets: [],
      currentPreset: null,
      bands: [],
      loading: false,
      isDirty: false,
      mode: 'user', // 'user' or 'professional'
      activeEqType: 'ieq' // 'ieq' or 'geq'
    };
    this.eventListeners = [];
    this.daxFilePath = `${window.core.MODULE_PATH}/system/vendor/etc/dolby/dax-default.xml`;
    
    // 标准化频率范围
    this.standardFrequencies = [47, 141, 234, 328, 469, 656, 844, 1031, 1313, 1688, 2250, 3000, 3750, 4688, 5813, 7125, 9000, 11250, 13875, 19688];
    
    // 用户模式简化频率（10段）
    this.userFrequencies = [47, 141, 328, 656, 1031, 1688, 3000, 4688, 7125, 13875];
  }

  async render() {
    // 导入CSS样式
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = './assets/css/pages/dax-equalizer.css';
    if (!document.querySelector('link[href="./assets/css/pages/dax-equalizer.css"]')) {
      document.head.appendChild(cssLink);
    }

    return `
      <div class="dax-equalizer">
        <div class="dax-header">
          <div class="header-content">
            <h2>${window.i18n.t('daxEqualizer.title')}</h2>
            <p class="dax-description">${window.i18n.t('daxEqualizer.description')}</p>
          </div>
          
          <!-- 模式切换 -->
          <div class="mode-switcher">
            <div class="mode-tabs">
              <button id="user-mode-btn" class="mode-tab active" data-mode="user">
                <span class="material-symbols-rounded">tune</span>
                <span>${window.i18n.t('daxEqualizer.userMode')}</span>
              </button>
              <button id="pro-mode-btn" class="mode-tab" data-mode="professional">
                <span class="material-symbols-rounded">settings</span>
                <span>${window.i18n.t('daxEqualizer.professionalMode')}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 用户模式界面 -->
        <div id="user-mode-content" class="mode-content active">
          <div class="user-eq-container">
            <div class="eq-presets">
              <h3>${window.i18n.t('daxEqualizer.quickPresets')}</h3>
              <div class="preset-buttons">
                <button class="preset-btn" data-preset="flat">${window.i18n.t('daxEqualizer.presetFlat')}</button>
                <button class="preset-btn" data-preset="bass">${window.i18n.t('daxEqualizer.presetBass')}</button>
                <button class="preset-btn" data-preset="vocal">${window.i18n.t('daxEqualizer.presetVocal')}</button>
                <button class="preset-btn" data-preset="treble">${window.i18n.t('daxEqualizer.presetTreble')}</button>
              </div>
            </div>
            
            <div class="user-equalizer">
              <h3>${window.i18n.t('daxEqualizer.customEqualizer')}</h3>
              <div class="user-eq-bands" id="user-eq-bands"></div>
            </div>
          </div>
        </div>

        <!-- 专业模式界面 -->
        <div id="professional-mode-content" class="mode-content">
          <div class="pro-controls">
            <div class="profile-selector">
              <label>${window.i18n.t('daxEqualizer.profile')}:</label>
              <select id="profile-select" class="md-select">
                <option value="">${window.i18n.t('daxEqualizer.selectProfile')}</option>
              </select>
            </div>

            <div class="preset-selector">
              <label>${window.i18n.t('daxEqualizer.preset')}:</label>
              <select id="preset-select" class="md-select">
                <option value="">${window.i18n.t('daxEqualizer.selectPreset')}</option>
              </select>
            </div>
          </div>

          <div class="equalizer-container">
            <div class="eq-type-tabs">
              <button id="ieq-tab" class="tab-button active">${window.i18n.t('daxEqualizer.ieqTab')}</button>
              <button id="geq-tab" class="tab-button">${window.i18n.t('daxEqualizer.geqTab')}</button>
            </div>

            <div class="eq-content">
              <div id="ieq-panel" class="eq-panel active">
                <div class="eq-bands" id="ieq-bands"></div>
              </div>
              <div id="geq-panel" class="eq-panel">
                <div class="eq-bands" id="geq-bands"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="dax-actions">
          <button id="reset-btn" class="md-button secondary">
            <span class="material-symbols-rounded">refresh</span>
            ${window.i18n.t('daxEqualizer.reset')}
          </button>
          <button id="save-btn" class="md-button primary" disabled>
            <span class="material-symbols-rounded">save</span>
            ${window.i18n.t('daxEqualizer.save')}
          </button>
          <button id="backup-btn" class="md-button secondary">
            <span class="material-symbols-rounded">backup</span>
            ${window.i18n.t('daxEqualizer.backup')}
          </button>
          <button id="restore-btn" class="md-button secondary">
            <span class="material-symbols-rounded">restore</span>
            ${window.i18n.t('daxEqualizer.restore')}
          </button>
        </div>

        <div class="loading-overlay" id="loading-overlay" style="display: none;">
          <div class="loading-spinner"></div>
          <p>${window.i18n.t('daxEqualizer.loading')}</p>
        </div>
      </div>
    `;
  }

  async onShow() {
    await this.loadDaxConfig();
    this.setupEventListeners();
    this.renderEqualizer();
  }

  setupEventListeners() {
    // 模式切换
    document.getElementById('user-mode-btn').addEventListener('click', () => {
      this.switchMode('user');
    });
    document.getElementById('pro-mode-btn').addEventListener('click', () => {
      this.switchMode('professional');
    });

    // 用户模式预设按钮
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.applyUserPreset(e.target.dataset.preset);
      });
    });

    // Profile selector (专业模式)
    const profileSelect = document.getElementById('profile-select');
    if (profileSelect) {
      profileSelect.addEventListener('change', (e) => {
        this.selectProfile(e.target.value);
      });
    }

    // Preset selector (专业模式)
    const presetSelect = document.getElementById('preset-select');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        this.selectPreset(e.target.value);
      });
    }

    // Tab switching (专业模式)
    const ieqTab = document.getElementById('ieq-tab');
    const geqTab = document.getElementById('geq-tab');
    if (ieqTab) {
      ieqTab.addEventListener('click', () => {
        this.switchTab('ieq');
      });
    }
    if (geqTab) {
      geqTab.addEventListener('click', () => {
        this.switchTab('geq');
      });
    }

    // Action buttons
    document.getElementById('reset-btn').addEventListener('click', () => {
      this.resetEqualizer();
    });
    document.getElementById('save-btn').addEventListener('click', () => {
      this.saveConfig();
    });
    document.getElementById('backup-btn').addEventListener('click', () => {
      this.backupConfig();
    });
    document.getElementById('restore-btn').addEventListener('click', () => {
      this.restoreConfig();
    });
  }

  async loadDaxConfig() {
    this.showLoading(true);
    try {
      const result = await window.core.exec(`cat "${this.daxFilePath}"`);
      if (result.errno === 0 && result.stdout) {
        this.parseDaxXml(result.stdout);
        this.populateSelectors();
      } else {
        const errorMsg = result.stderr || 'DAX配置文件不存在或无法读取';
        window.core.showError(window.i18n.t('daxEqualizer.loadError'), errorMsg);
        if (window.core.isDebugMode()) {
          window.core.logDebug(`DAX config load failed: errno=${result.errno}, stderr=${result.stderr}`, 'DAX');
        }
      }
    } catch (error) {
      window.core.showError(window.i18n.t('daxEqualizer.loadError'), error.message);
      if (window.core.isDebugMode()) {
        window.core.logDebug(`DAX config load exception: ${error.message}`, 'DAX');
      }
    }
    this.showLoading(false);
  }

  parseDaxXml(xmlContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Parse presets
    this.data.presets = [];
    const presets = xmlDoc.querySelectorAll('preset');
    presets.forEach(preset => {
      const id = preset.getAttribute('id');
      const type = preset.getAttribute('type');
      const bands = [];
      
      if (type === 'ieq') {
        const ieqBands = preset.querySelectorAll('band_ieq');
        ieqBands.forEach(band => {
          bands.push({
            frequency: parseInt(band.getAttribute('frequency')),
            target: parseInt(band.getAttribute('target'))
          });
        });
      } else if (type === 'geq') {
        const geqBands = preset.querySelectorAll('band_geq');
        geqBands.forEach(band => {
          bands.push({
            frequency: parseInt(band.getAttribute('frequency')),
            gain: parseInt(band.getAttribute('gain'))
          });
        });
      }
      
      this.data.presets.push({ id, type, bands });
    });

    // Parse profiles
    this.data.profiles = [];
    const profiles = xmlDoc.querySelectorAll('profile');
    profiles.forEach(profile => {
      const id = profile.getAttribute('id');
      const name = profile.getAttribute('name');
      const group = profile.getAttribute('group');
      
      this.data.profiles.push({ id, name, group });
    });
  }

  populateSelectors() {
    const profileSelect = document.getElementById('profile-select');
    const presetSelect = document.getElementById('preset-select');
    
    // Clear existing options
    profileSelect.innerHTML = `<option value="">${window.i18n.t('daxEqualizer.selectProfile')}</option>`;
    presetSelect.innerHTML = `<option value="">${window.i18n.t('daxEqualizer.selectPreset')}</option>`;
    
    // Populate profiles
    this.data.profiles.forEach(profile => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = `${profile.name} (ID: ${profile.id})`;
      profileSelect.appendChild(option);
    });
    
    // Populate presets
    this.data.presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = `${preset.type.toUpperCase()} Preset ${preset.id}`;
      presetSelect.appendChild(option);
    });
  }

  selectProfile(profileId) {
    this.data.currentProfile = this.data.profiles.find(p => p.id === profileId);
    window.core.logDebug(`Selected profile: ${profileId}`, 'DAX_EQ');
  }

  selectPreset(presetId) {
    this.data.currentPreset = this.data.presets.find(p => p.id === presetId);
    if (this.data.currentPreset) {
      this.data.bands = [...this.data.currentPreset.bands];
      this.data.activeEqType = this.data.currentPreset.type;
      this.renderEqualizer();
      if (this.data.mode === 'professional') {
        this.switchTab(this.data.currentPreset.type);
      }
    }
    if (window.core.isDebugMode()) {
      window.core.logDebug(`Selected preset: ${presetId}`, 'DAX_EQ');
    }
  }

  // 模式切换
  switchMode(mode) {
    this.data.mode = mode;
    
    // 更新模式按钮状态
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    
    // 切换内容显示
    document.querySelectorAll('.mode-content').forEach(content => {
      content.classList.toggle('active', content.id === `${mode}-mode-content`);
    });
    
    // 重新渲染均衡器
    this.renderEqualizer();
    
    if (window.core.isDebugMode()) {
      window.core.logDebug(`Switched to ${mode} mode`, 'DAX_EQ');
    }
  }

  // 应用用户模式预设
  applyUserPreset(presetType) {
    const presetValues = this.getUserPresetValues(presetType);
    
    // 更新用户频率的值
    this.data.bands = this.userFrequencies.map((freq, index) => ({
      frequency: freq,
      gain: presetValues[index] || 0
    }));
    
    this.renderUserEqualizer();
    this.markDirty();
    
    // 更新预设按钮状态
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetType);
    });
    
    if (window.core.isDebugMode()) {
      window.core.logDebug(`Applied user preset: ${presetType}`, 'DAX_EQ');
    }
  }

  // 获取用户预设值
  getUserPresetValues(presetType) {
    const presets = {
      flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bass: [6, 4, 2, 0, -1, -2, -1, 0, 1, 2],
      vocal: [-2, -1, 1, 3, 4, 3, 2, 1, -1, -2],
      treble: [-2, -1, 0, 1, 2, 3, 4, 5, 4, 3]
    };
    return presets[presetType] || presets.flat;
  }

  switchTab(type) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${type}-tab`).classList.add('active');
    
    // Update panels
    document.querySelectorAll('.eq-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`${type}-panel`).classList.add('active');
  }

  renderEqualizer() {
    if (this.data.mode === 'user') {
      this.renderUserEqualizer();
    } else {
      this.renderProfessionalEqualizer();
    }
  }

  // 渲染用户模式均衡器
  renderUserEqualizer() {
    const container = document.getElementById('user-eq-bands');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 如果没有数据，初始化为平坦响应
    if (this.data.bands.length === 0) {
      this.data.bands = this.userFrequencies.map(freq => ({
        frequency: freq,
        gain: 0
      }));
    }
    
    this.data.bands.forEach((band, index) => {
      const bandElement = this.createUserBandSlider(band, index);
      container.appendChild(bandElement);
    });
  }

  // 渲染专业模式均衡器
  renderProfessionalEqualizer() {
    if (!this.data.currentPreset) return;
    
    const type = this.data.currentPreset.type;
    const container = document.getElementById(`${type}-bands`);
    if (!container) return;
    
    container.innerHTML = '';
    
    this.data.bands.forEach((band, index) => {
      const bandElement = this.createBandSlider(band, index, type);
      container.appendChild(bandElement);
    });
  }

  // 创建用户模式滑块
  createUserBandSlider(band, index) {
    const div = document.createElement('div');
    div.className = 'user-eq-band';
    
    const freqLabel = this.formatFrequency(band.frequency);
    
    div.innerHTML = `
      <div class="band-header">
        <span class="frequency-label">${freqLabel}</span>
        <span class="gain-value" id="user-value-${index}">${band.gain > 0 ? '+' : ''}${band.gain}dB</span>
      </div>
      <div class="slider-container">
        <input type="range" 
               class="user-eq-slider" 
               id="user-slider-${index}"
               min="-12" 
               max="12" 
               step="0.5"
               value="${band.gain}">
        <div class="slider-track">
          <div class="slider-fill" style="height: ${((band.gain + 12) / 24) * 100}%"></div>
        </div>
      </div>
    `;
    
    const slider = div.querySelector('.user-eq-slider');
    const valueSpan = div.querySelector('.gain-value');
    const sliderFill = div.querySelector('.slider-fill');
    
    slider.addEventListener('input', (e) => {
      const newValue = parseFloat(e.target.value);
      this.data.bands[index].gain = newValue;
      valueSpan.textContent = `${newValue > 0 ? '+' : ''}${newValue}dB`;
      sliderFill.style.height = `${((newValue + 12) / 24) * 100}%`;
      this.markDirty();
    });
    
    return div;
  }

  // 创建专业模式滑块
  createBandSlider(band, index, type) {
    const div = document.createElement('div');
    div.className = 'eq-band professional';
    
    const valueKey = type === 'ieq' ? 'target' : 'gain';
    const minValue = type === 'ieq' ? -1000 : -12;
    const maxValue = type === 'ieq' ? 1000 : 12;
    const step = type === 'ieq' ? 10 : 0.1;
    const unit = type === 'ieq' ? '' : 'dB';
    
    div.innerHTML = `
      <div class="band-info">
        <span class="frequency">${this.formatFrequency(band.frequency)}</span>
        <span class="value" id="value-${index}">${band[valueKey]}${unit}</span>
      </div>
      <input type="range" 
             class="eq-slider" 
             id="slider-${index}"
             min="${minValue}" 
             max="${maxValue}" 
             step="${step}"
             value="${band[valueKey]}">
    `;
    
    const slider = div.querySelector('.eq-slider');
    const valueSpan = div.querySelector('.value');
    
    slider.addEventListener('input', (e) => {
      const newValue = parseFloat(e.target.value);
      this.data.bands[index][valueKey] = newValue;
      valueSpan.textContent = `${newValue}${unit}`;
      this.markDirty();
    });
    
    return div;
  }

  // 格式化频率显示
  formatFrequency(freq) {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}kHz`;
    }
    return `${freq}Hz`;
  }

  markDirty() {
    this.data.isDirty = true;
    document.getElementById('save-btn').disabled = false;
  }

  // 显示加载状态
  showLoading(show = true) {
    const container = document.querySelector('.dax-equalizer');
    if (!container) return;
    
    let overlay = container.querySelector('.loading-overlay');
    
    if (show) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        container.style.position = 'relative';
        container.appendChild(overlay);
      }
    } else {
      if (overlay) {
        overlay.remove();
      }
    }
  }

  async resetEqualizer() {
    const confirmed = await window.DialogManager.confirm(
      window.i18n.t('daxEqualizer.resetTitle'),
      window.i18n.t('daxEqualizer.resetMessage')
    );
    
    if (!confirmed) return;
    
    if (this.data.mode === 'user') {
      // 用户模式重置为平坦响应
      this.data.bands = this.userFrequencies.map(freq => ({
        frequency: freq,
        gain: 0
      }));
      this.renderUserEqualizer();
      
      // 清除预设按钮状态
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelector('.preset-btn[data-preset="flat"]')?.classList.add('active');
    } else {
      // 专业模式重置
      if (!this.data.currentPreset) return;
      
      const originalPreset = this.data.presets.find(p => p.id === this.data.currentPreset.id);
      if (originalPreset) {
        this.data.bands = [...originalPreset.bands];
        this.renderProfessionalEqualizer();
      }
    }
    
    this.data.isDirty = false;
     
     const saveBtn = document.getElementById('save-btn');
     if (saveBtn) {
       saveBtn.classList.remove('dirty');
     }
     
     window.core.showToast(window.i18n.t('daxEqualizer.resetSuccess'));
    
    if (window.core.isDebugMode()) {
      window.core.logDebug('Equalizer reset completed', 'DAX_EQ');
    }
  }

  async saveConfig() {
    if (!this.data.currentPreset || !this.data.isDirty) return;
    
    const confirmed = await window.DialogManager.showConfirm(
      window.i18n.t('daxEqualizer.saveTitle'),
      window.i18n.t('daxEqualizer.saveMessage')
    );
    
    if (!confirmed) return;
    
    this.showLoading(true);
    try {
      const updatedXml = await this.generateUpdatedXml();
      
      // Create a temporary file first
      const tempFile = '/tmp/dax-temp.xml';
      const escapedXml = updatedXml.replace(/'/g, "'\"'\"'");
      
      // Write to temp file
      const writeResult = await window.core.exec(`echo '${escapedXml}' > "${tempFile}"`);
      if (writeResult.errno !== 0) {
        throw new Error(`Failed to create temporary file: ${writeResult.stderr}`);
      }
      
      // Copy temp file to target location
      const copyResult = await window.core.exec(`cp "${tempFile}" "${this.daxFilePath}"`);
      if (copyResult.errno !== 0) {
        throw new Error(`Failed to copy file to target location: ${copyResult.stderr}`);
      }
      
      // Clean up temp file
      await window.core.exec(`rm "${tempFile}"`);
      
      // Set proper permissions
      await window.core.exec(`chmod 644 "${this.daxFilePath}"`);
      
      this.data.isDirty = false;
      document.getElementById('save-btn').disabled = true;
      window.core.showToast(window.i18n.t('daxEqualizer.saveSuccess'), 'success');
      
      // Reload the configuration to verify changes
      await this.loadDaxConfig();
      
    } catch (error) {
      window.core.showError(window.i18n.t('daxEqualizer.saveError'), error.message);
      window.core.logDebug(`Save error: ${error.message}`, 'DAX_EQ');
    }
    this.showLoading(false);
  }

  async generateUpdatedXml() {
    try {
      // Read the current XML file
      const result = await window.core.exec(`cat "${this.daxFilePath}"`);
      if (result.errno !== 0 || !result.stdout) {
        throw new Error(`Failed to read current XML file: ${result.stderr}`);
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(result.stdout, 'text/xml');
      
      // Find and update the current preset
      const presets = xmlDoc.querySelectorAll('preset');
      let targetPreset = null;
      
      for (let preset of presets) {
        if (preset.getAttribute('id') === this.data.currentPreset.id) {
          targetPreset = preset;
          break;
        }
      }
      
      if (!targetPreset) {
        throw new Error('Target preset not found in XML');
      }
      
      // Clear existing bands
      const existingBands = targetPreset.querySelectorAll(this.data.currentPreset.type === 'ieq' ? 'band_ieq' : 'band_geq');
      existingBands.forEach(band => band.remove());
      
      // Find or create the data container
      let dataContainer = targetPreset.querySelector('data');
      if (!dataContainer) {
        dataContainer = xmlDoc.createElement('data');
        targetPreset.appendChild(dataContainer);
      }
      
      // Find or create the bands container
      const containerName = this.data.currentPreset.type === 'ieq' ? 'ieq-bands' : 'graphic-equalizer-bands';
      let bandsContainer = dataContainer.querySelector(containerName);
      if (!bandsContainer) {
        bandsContainer = xmlDoc.createElement(containerName);
        dataContainer.appendChild(bandsContainer);
      }
      
      // Add updated bands
      this.data.bands.forEach(band => {
        const bandElement = xmlDoc.createElement(this.data.currentPreset.type === 'ieq' ? 'band_ieq' : 'band_geq');
        bandElement.setAttribute('frequency', band.frequency.toString());
        
        if (this.data.currentPreset.type === 'ieq') {
          bandElement.setAttribute('target', Math.round(band.target).toString());
        } else {
          bandElement.setAttribute('gain', band.gain.toString());
        }
        
        bandsContainer.appendChild(bandElement);
      });
      
      // Serialize the XML
      const serializer = new XMLSerializer();
      let xmlString = serializer.serializeToString(xmlDoc);
      
      // Format the XML properly
      xmlString = this.formatXml(xmlString);
      
      return xmlString;
    } catch (error) {
      window.core.logDebug(`XML generation error: ${error.message}`, 'DAX_EQ');
      throw error;
    }
  }
  
  formatXml(xml) {
    // Simple XML formatting
    let formatted = '';
    let indent = '';
    const tab = '  ';
    
    xml.split(/></).forEach((node, index) => {
      if (index > 0) {
        node = '<' + node;
      }
      if (index < xml.split(/></).length - 1) {
        node = node + '>';
      }
      
      if (node.match(/^<\w[^>]*[^/]>.*<\/\w/)) {
        // Self-contained tag
        formatted += indent + node + '\n';
      } else if (node.match(/^<\w/)) {
        // Opening tag
        formatted += indent + node + '\n';
        indent += tab;
      } else if (node.match(/^<\//)) {
        // Closing tag
        indent = indent.substring(tab.length);
        formatted += indent + node + '\n';
      } else {
        // Content or self-closing tag
        formatted += indent + node + '\n';
      }
    });
    
    return formatted;
  }

  async backupConfig() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `/sdcard/dax-backup-${timestamp}.xml`;
      
      const result = await window.core.exec(`cp "${this.daxFilePath}" "${backupPath}"`);
      if (result.errno === 0) {
        window.core.showToast(window.i18n.t('daxEqualizer.backupSuccess', { path: backupPath }), 'success');
      } else {
        window.core.showError(window.i18n.t('daxEqualizer.backupError'), result.stderr);
      }
    } catch (error) {
      window.core.showError(window.i18n.t('daxEqualizer.backupError'), error.message);
    }
  }

  async restoreConfig() {
    const input = await window.DialogManager.showInput(
      window.i18n.t('daxEqualizer.restoreTitle'),
      window.i18n.t('daxEqualizer.restoreMessage'),
      window.i18n.t('daxEqualizer.restorePlaceholder')
    );
    
    if (!input) return;
    
    try {
      const result = await window.core.exec(`cp "${input}" "${this.daxFilePath}"`);
      if (result.errno === 0) {
        window.core.showToast(window.i18n.t('daxEqualizer.restoreSuccess'), 'success');
        await this.loadDaxConfig();
      } else {
        window.core.showError(window.i18n.t('daxEqualizer.restoreError'), result.stderr);
      }
    } catch (error) {
      window.core.showError(window.i18n.t('daxEqualizer.restoreError'), error.message);
    }
  }

  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
    this.data.loading = show;
  }

  getPageActions() {
    return [
      {
        icon: 'refresh',
        title: window.i18n.t('daxEqualizer.refresh'),
        action: () => this.loadDaxConfig()
      },
      {
        icon: 'help',
        title: window.i18n.t('daxEqualizer.help'),
        action: () => this.showHelp()
      }
    ];
  }

  async showHelp() {
    await window.DialogManager.showGeneric({
      title: window.i18n.t('daxEqualizer.helpTitle'),
      content: `
        <div class="help-content">
          <p>${window.i18n.t('daxEqualizer.helpContent1')}</p>
          <p>${window.i18n.t('daxEqualizer.helpContent2')}</p>
          <p>${window.i18n.t('daxEqualizer.helpContent3')}</p>
        </div>
      `,
      buttons: [
        { text: window.i18n.t('common.close'), action: () => {} }
      ],
      closable: true
    });
  }

  cleanup() {
    this.eventListeners.forEach(listener => {
      listener.element.removeEventListener(listener.event, listener.handler);
    });
    this.eventListeners = [];
  }
}

export { DaxequalizerPage };
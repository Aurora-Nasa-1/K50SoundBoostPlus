class DaxequalizerPage {
  constructor() {
    this.data = {
      profiles: [],
      currentProfile: null,
      presets: [],
      currentPreset: null,
      bands: [],
      loading: false,
      isDirty: false
    };
    this.eventListeners = [];
    this.daxFilePath = `${window.core.MODULE_PATH}/system/vendor/etc/dolby/dax-default.xml`;
  }

  async render() {
    return `
        <div class="dax-controls">
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

        <div class="dax-actions">
          <button id="reset-btn" class="md-button secondary">${window.i18n.t('daxEqualizer.reset')}</button>
          <button id="save-btn" class="md-button primary" disabled>${window.i18n.t('daxEqualizer.save')}</button>
          <button id="backup-btn" class="md-button secondary">${window.i18n.t('daxEqualizer.backup')}</button>
          <button id="restore-btn" class="md-button secondary">${window.i18n.t('daxEqualizer.restore')}</button>
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
    // Profile selector
    const profileSelect = document.getElementById('profile-select');
    profileSelect.addEventListener('change', (e) => {
      this.selectProfile(e.target.value);
    });

    // Preset selector
    const presetSelect = document.getElementById('preset-select');
    presetSelect.addEventListener('change', (e) => {
      this.selectPreset(e.target.value);
    });

    // Tab switching
    document.getElementById('ieq-tab').addEventListener('click', () => {
      this.switchTab('ieq');
    });
    document.getElementById('geq-tab').addEventListener('click', () => {
      this.switchTab('geq');
    });

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
      this.renderEqualizer();
      this.switchTab(this.data.currentPreset.type);
    }
    window.core.logDebug(`Selected preset: ${presetId}`, 'DAX_EQ');
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
    if (!this.data.currentPreset) return;
    
    const type = this.data.currentPreset.type;
    const container = document.getElementById(`${type}-bands`);
    container.innerHTML = '';
    
    this.data.bands.forEach((band, index) => {
      const bandElement = this.createBandSlider(band, index, type);
      container.appendChild(bandElement);
    });
  }

  createBandSlider(band, index, type) {
    const div = document.createElement('div');
    div.className = 'eq-band';
    
    const valueKey = type === 'ieq' ? 'target' : 'gain';
    const minValue = type === 'ieq' ? -1000 : -12;
    const maxValue = type === 'ieq' ? 1000 : 12;
    const step = type === 'ieq' ? 10 : 0.1;
    
    div.innerHTML = `
      <div class="band-info">
        <span class="frequency">${band.frequency}Hz</span>
        <span class="value" id="value-${index}">${band[valueKey]}</span>
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
      valueSpan.textContent = newValue;
      this.markDirty();
    });
    
    return div;
  }

  markDirty() {
    this.data.isDirty = true;
    document.getElementById('save-btn').disabled = false;
  }

  async resetEqualizer() {
    if (!this.data.currentPreset) return;
    
    const confirmed = await window.DialogManager.showConfirm(
      window.i18n.t('daxEqualizer.resetTitle'),
      window.i18n.t('daxEqualizer.resetMessage')
    );
    
    if (confirmed) {
      this.data.bands = [...this.data.currentPreset.bands];
      this.renderEqualizer();
      this.data.isDirty = false;
      document.getElementById('save-btn').disabled = true;
      window.core.showToast(window.i18n.t('daxEqualizer.resetSuccess'), 'success');
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
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
      mode: 'simple', // 'simple' or 'advanced'
      activeEqType: 'ieq' // 'ieq' or 'geq'
    };
    this.eventListeners = [];
    this.daxFilePath = `${window.core.MODULE_PATH}/system/vendor/etc/dolby/dax-default.xml`;
    
    // 标准化频率范围 (20段专业模式)
    this.standardFrequencies = [47, 141, 234, 328, 469, 656, 844, 1031, 1313, 1688, 2250, 3000, 3750, 4688, 5813, 7125, 9000, 11250, 13875, 19688];
    
    // 简化频率 (10段用户模式)
    this.simpleFrequencies = [47, 141, 328, 656, 1031, 1688, 3000, 4688, 7125, 13875];
    
    // 预设配置
    this.presetConfigs = {
      flat: { name: 'presetFlat', values: new Array(10).fill(0) },
      bass: { name: 'presetBass', values: [6, 4, 2, 1, 0, 0, 0, 0, 0, 0] },
      vocal: { name: 'presetVocal', values: [-2, -1, 1, 3, 4, 3, 1, -1, -2, -2] },
      treble: { name: 'presetTreble', values: [0, 0, 0, 0, 0, 1, 2, 4, 6, 8] },
      rock: { name: 'presetRock', values: [4, 2, -1, -2, 0, 1, 3, 4, 3, 2] },
      pop: { name: 'presetPop', values: [-1, 2, 4, 4, 1, -1, -1, 1, 2, 3] },
      classical: { name: 'presetClassical', values: [3, 2, -1, -2, -1, 1, 2, 3, 4, 4] },
      jazz: { name: 'presetJazz', values: [2, 1, 1, -1, -2, -1, 1, 2, 3, 4] }
    };
  }

  async render() {
    return `
      <div class="dax-equalizer">
        <div class="dax-header">
          <h2 class="dax-title">${window.i18n.t('daxEqualizer.title')}</h2>
          <p class="dax-description">${window.i18n.t('daxEqualizer.description')}</p>
        </div>

        <!-- 模式切换 -->
        <div class="mode-tabs">
          <button id="simple-mode-tab" class="mode-tab active">${window.i18n.t('daxEqualizer.simpleMode')}</button>
          <button id="advanced-mode-tab" class="mode-tab">${window.i18n.t('daxEqualizer.advancedMode')}</button>
        </div>

        <!-- 简单模式 -->
        <div id="simple-mode" class="mode-content active">
          <div class="preset-section">
            <h3 class="section-title">${window.i18n.t('daxEqualizer.quickPresets')}</h3>
            <div class="preset-buttons">
              <button class="preset-btn" data-preset="flat">${window.i18n.t('daxEqualizer.presetFlat')}</button>
              <button class="preset-btn" data-preset="bass">${window.i18n.t('daxEqualizer.presetBass')}</button>
              <button class="preset-btn" data-preset="vocal">${window.i18n.t('daxEqualizer.presetVocal')}</button>
              <button class="preset-btn" data-preset="treble">${window.i18n.t('daxEqualizer.presetTreble')}</button>
              <button class="preset-btn" data-preset="rock">${window.i18n.t('daxEqualizer.presetRock')}</button>
              <button class="preset-btn" data-preset="pop">${window.i18n.t('daxEqualizer.presetPop')}</button>
              <button class="preset-btn" data-preset="classical">${window.i18n.t('daxEqualizer.presetClassical')}</button>
              <button class="preset-btn" data-preset="jazz">${window.i18n.t('daxEqualizer.presetJazz')}</button>
            </div>
          </div>

          <div class="equalizer-section">
            <h3 class="section-title">${window.i18n.t('daxEqualizer.customEqualizer')}</h3>
            <div class="simple-equalizer">
              <div id="simple-eq-bands" class="eq-bands simple"></div>
            </div>
          </div>
        </div>

        <!-- 高级模式 -->
        <div id="advanced-mode" class="mode-content">
          <div class="advanced-controls">
            <div class="control-group">
              <label class="control-label">${window.i18n.t('daxEqualizer.profile')}</label>
              <select id="profile-select" class="control-select">
                <option value="">${window.i18n.t('daxEqualizer.selectProfile')}</option>
              </select>
            </div>
            <div class="control-group">
              <label class="control-label">${window.i18n.t('daxEqualizer.preset')}</label>
              <select id="preset-select" class="control-select">
                <option value="">${window.i18n.t('daxEqualizer.selectPreset')}</option>
              </select>
            </div>
          </div>
          <div class="eq-tabs">
            <button id="ieq-tab" class="eq-tab active">IEQ</button>
            <button id="geq-tab" class="eq-tab">GEQ</button>
          </div>
          <div class="advanced-equalizer">
            <div id="ieq-bands" class="eq-bands advanced" style="display: grid;"></div>
            <div id="geq-bands" class="eq-bands advanced" style="display: none;"></div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="dax-actions">
          <button id="reset-btn" class="action-btn secondary">${window.i18n.t('daxEqualizer.reset')}</button>
          <button id="save-btn" class="action-btn primary" disabled>${window.i18n.t('daxEqualizer.save')}</button>
          <button id="backup-btn" class="action-btn secondary">${window.i18n.t('daxEqualizer.backup')}</button>
          <button id="restore-btn" class="action-btn secondary">${window.i18n.t('daxEqualizer.restore')}</button>
          <button id="help-btn" class="action-btn secondary">${window.i18n.t('daxEqualizer.help')}</button>
        </div>

        <!-- 加载遮罩 -->
        <div class="loading-overlay" id="loading-overlay" style="display: none;">
          <div class="loading-spinner"></div>
          <p>${window.i18n.t('daxEqualizer.loading')}</p>
        </div>
      </div>
    `;
  }

  getPageActions() {
    return [
      {
        icon: 'refresh',
        title: window.i18n.t('daxEqualizer.refresh'),
        action: () => this.loadDaxConfig()
      }
    ];
  }

  async onShow() {
    await this.loadDaxConfig();
    this.setupEventListeners();
    this.renderEqualizer();
  }

  setupEventListeners() {
    // 模式切换
    document.getElementById('simple-mode-tab').addEventListener('click', () => {
      this.switchMode('simple');
    });
    document.getElementById('advanced-mode-tab').addEventListener('click', () => {
      this.switchMode('advanced');
    });

    // 预设按钮
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.applyPreset(e.target.dataset.preset);
      });
    });

    // 高级模式控件
    const profileSelect = document.getElementById('profile-select');
    if (profileSelect) {
      profileSelect.addEventListener('change', (e) => {
        this.selectProfile(e.target.value);
      });
    }

    const presetSelect = document.getElementById('preset-select');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        this.selectPreset(e.target.value);
      });
    }

    // EQ类型切换
    document.getElementById('ieq-tab').addEventListener('click', () => {
      this.switchEqType('ieq');
    });
    document.getElementById('geq-tab').addEventListener('click', () => {
      this.switchEqType('geq');
    });

    // 操作按钮
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
    document.getElementById('help-btn').addEventListener('click', () => {
      this.showHelp();
    });
  }

  async loadDaxConfig() {
    this.showLoading(true);
    try {
      // 检查文件是否存在
      const checkResult = await window.core.exec(`test -f "${this.daxFilePath}" && echo "exists" || echo "not_exists"`);
      
      if (checkResult.stdout.trim() === 'not_exists') {
        // 文件不存在，创建默认配置
        await this.createDefaultDaxConfig();
      }
      
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

  async createDefaultDaxConfig() {
    const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<dax_config version="1.0">
  <profiles>
    <profile id="music" name="Music" group="media">
      <preset id="music_ieq" type="ieq">
        <data>
          <ieq-bands>
            <band_ieq frequency="47" target="0"/>
            <band_ieq frequency="141" target="0"/>
            <band_ieq frequency="328" target="0"/>
            <band_ieq frequency="656" target="0"/>
            <band_ieq frequency="1031" target="0"/>
            <band_ieq frequency="1688" target="0"/>
            <band_ieq frequency="3000" target="0"/>
            <band_ieq frequency="4688" target="0"/>
            <band_ieq frequency="7125" target="0"/>
            <band_ieq frequency="13875" target="0"/>
          </ieq-bands>
        </data>
      </preset>
      <preset id="music_geq" type="geq">
        <data>
          <graphic-equalizer-bands>
            <band_geq frequency="47" gain="0"/>
            <band_geq frequency="141" gain="0"/>
            <band_geq frequency="328" gain="0"/>
            <band_geq frequency="656" gain="0"/>
            <band_geq frequency="1031" gain="0"/>
            <band_geq frequency="1688" gain="0"/>
            <band_geq frequency="3000" gain="0"/>
            <band_geq frequency="4688" gain="0"/>
            <band_geq frequency="7125" gain="0"/>
            <band_geq frequency="13875" gain="0"/>
          </graphic-equalizer-bands>
        </data>
      </preset>
    </profile>
  </profiles>
</dax_config>`;

    // 确保目录存在
    await window.core.exec(`mkdir -p "$(dirname "${this.daxFilePath}")"`); 
    
    // 创建默认配置文件
    const tempFile = '/tmp/dax-default.xml';
    const escapedXml = defaultXml.replace(/'/g, "'\"'\"'");
    await window.core.exec(`echo '${escapedXml}' > "${tempFile}"`);
    await window.core.exec(`cp "${tempFile}" "${this.daxFilePath}"`);
    await window.core.exec(`chmod 644 "${this.daxFilePath}"`);
    await window.core.exec(`rm "${tempFile}"`);
    
    window.core.showToast(window.i18n.t('daxEqualizer.defaultConfigCreated'), 'info');
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
    
    if (profileSelect) {
      profileSelect.innerHTML = `<option value="">${window.i18n.t('daxEqualizer.selectProfile')}</option>`;
      this.data.profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.name;
        profileSelect.appendChild(option);
      });
    }
    
    if (presetSelect) {
      presetSelect.innerHTML = `<option value="">${window.i18n.t('daxEqualizer.selectPreset')}</option>`;
      this.data.presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = `${preset.id} (${preset.type.toUpperCase()})`;
        presetSelect.appendChild(option);
      });
    }
  }

  switchMode(mode) {
    this.data.mode = mode;
    
    // 更新标签状态
    document.querySelectorAll('.mode-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${mode}-mode-tab`).classList.add('active');
    
    // 更新内容显示
    document.querySelectorAll('.mode-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${mode}-mode`).classList.add('active');
    
    this.renderEqualizer();
  }

  switchEqType(type) {
    this.data.activeEqType = type;
    
    // 更新标签状态
    document.querySelectorAll('.eq-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${type}-tab`).classList.add('active');
    
    // 更新面板显示
    document.getElementById('ieq-bands').style.display = type === 'ieq' ? 'grid' : 'none';
    document.getElementById('geq-bands').style.display = type === 'geq' ? 'grid' : 'none';
    
    this.renderEqualizer();
  }

  renderEqualizer() {
    if (this.data.mode === 'simple') {
      this.renderSimpleEqualizer();
    } else {
      this.renderAdvancedEqualizer();
    }
  }

  renderSimpleEqualizer() {
    const container = document.getElementById('simple-eq-bands');
    if (!container) return;
    
    container.innerHTML = '';
    
    this.simpleFrequencies.forEach((freq, index) => {
      const band = document.createElement('div');
      band.className = 'eq-band';
      
      const freqLabel = this.formatFrequency(freq);
      const currentValue = this.data.bands[index]?.gain || 0;
      
      band.innerHTML = `
        <div class="eq-freq-label">${freqLabel}</div>
        <input type="range" class="eq-slider" 
               min="-12" max="12" step="0.5" value="${currentValue}"
               data-frequency="${freq}" data-index="${index}">
        <div class="eq-value-label">${currentValue > 0 ? '+' : ''}${currentValue}dB</div>
      `;
      
      const slider = band.querySelector('.eq-slider');
      slider.addEventListener('input', (e) => {
        this.updateBandValue(index, parseFloat(e.target.value));
        band.querySelector('.eq-value-label').textContent = 
          `${e.target.value > 0 ? '+' : ''}${e.target.value}dB`;
      });
      
      container.appendChild(band);
    });
  }

  renderAdvancedEqualizer() {
    const ieqContainer = document.getElementById('ieq-bands');
    const geqContainer = document.getElementById('geq-bands');
    
    if (ieqContainer && this.data.activeEqType === 'ieq') {
      this.renderIEQBands(ieqContainer);
    }
    
    if (geqContainer && this.data.activeEqType === 'geq') {
      this.renderGEQBands(geqContainer);
    }
  }

  renderIEQBands(container) {
    container.innerHTML = '';
    
    this.standardFrequencies.forEach((freq, index) => {
      const band = document.createElement('div');
      band.className = 'eq-band';
      
      const freqLabel = this.formatFrequency(freq);
      const currentValue = this.data.bands[index]?.target || 0;
      
      band.innerHTML = `
        <div class="eq-freq-label">${freqLabel}</div>
        <input type="range" class="eq-slider" 
               min="-1000" max="1000" step="10" value="${currentValue}"
               data-frequency="${freq}" data-index="${index}">
        <div class="eq-value-label">${currentValue}</div>
      `;
      
      const slider = band.querySelector('.eq-slider');
      slider.addEventListener('input', (e) => {
        this.updateBandValue(index, parseInt(e.target.value), 'target');
        band.querySelector('.eq-value-label').textContent = e.target.value;
      });
      
      container.appendChild(band);
    });
  }

  renderGEQBands(container) {
    container.innerHTML = '';
    
    this.standardFrequencies.forEach((freq, index) => {
      const band = document.createElement('div');
      band.className = 'eq-band';
      
      const freqLabel = this.formatFrequency(freq);
      const currentValue = this.data.bands[index]?.gain || 0;
      
      band.innerHTML = `
        <div class="eq-freq-label">${freqLabel}</div>
        <input type="range" class="eq-slider" 
               min="-12" max="12" step="0.5" value="${currentValue}"
               data-frequency="${freq}" data-index="${index}">
        <div class="eq-value-label">${currentValue > 0 ? '+' : ''}${currentValue}dB</div>
      `;
      
      const slider = band.querySelector('.eq-slider');
      slider.addEventListener('input', (e) => {
        this.updateBandValue(index, parseFloat(e.target.value), 'gain');
        band.querySelector('.eq-value-label').textContent = 
          `${e.target.value > 0 ? '+' : ''}${e.target.value}dB`;
      });
      
      container.appendChild(band);
    });
  }

  formatFrequency(freq) {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(1)}k`;
    }
    return `${freq}`;
  }

  updateBandValue(index, value, type = 'gain') {
    if (!this.data.bands[index]) {
      this.data.bands[index] = {
        frequency: this.data.mode === 'simple' ? this.simpleFrequencies[index] : this.standardFrequencies[index]
      };
    }
    
    this.data.bands[index][type] = value;
    this.data.isDirty = true;
    document.getElementById('save-btn').disabled = false;
  }

  applyPreset(presetName) {
    const preset = this.presetConfigs[presetName];
    if (!preset) return;
    
    // 应用预设值到简单模式
    preset.values.forEach((value, index) => {
      this.updateBandValue(index, value);
    });
    
    // 更新UI
    this.renderEqualizer();
    
    // 高亮选中的预设按钮
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-preset="${presetName}"]`).classList.add('active');
    
    window.core.showToast(window.i18n.t('daxEqualizer.presetApplied', { preset: window.i18n.t(`daxEqualizer.${preset.name}`) }), 'success');
  }

  selectProfile(profileId) {
    this.data.currentProfile = this.data.profiles.find(p => p.id === profileId);
    // 根据选中的profile更新preset列表
    this.populatePresetsForProfile(profileId);
  }

  selectPreset(presetId) {
    this.data.currentPreset = this.data.presets.find(p => p.id === presetId);
    if (this.data.currentPreset) {
      this.data.bands = [...this.data.currentPreset.bands];
      this.data.activeEqType = this.data.currentPreset.type;
      this.switchEqType(this.data.activeEqType);
      this.renderEqualizer();
    }
  }

  populatePresetsForProfile(profileId) {
    // 这里可以根据profile过滤presets
    // 目前简单实现，显示所有presets
    this.populateSelectors();
  }

  async resetEqualizer() {
    const confirmed = await window.DialogManager.showConfirm(
      window.i18n.t('daxEqualizer.resetTitle'),
      window.i18n.t('daxEqualizer.resetMessage')
    );
    
    if (!confirmed) return;
    
    // 重置所有频段为0
    const frequencies = this.data.mode === 'simple' ? this.simpleFrequencies : this.standardFrequencies;
    this.data.bands = frequencies.map(freq => ({
      frequency: freq,
      gain: 0,
      target: 0
    }));
    
    this.data.isDirty = true;
    document.getElementById('save-btn').disabled = false;
    
    // 移除预设按钮高亮
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    
    this.renderEqualizer();
    window.core.showToast(window.i18n.t('daxEqualizer.resetSuccess'), 'success');
  }

  async saveConfig() {
    if (!this.data.isDirty) return;
    
    const confirmed = await window.DialogManager.showConfirm(
      window.i18n.t('daxEqualizer.saveTitle'),
      window.i18n.t('daxEqualizer.saveMessage')
    );
    
    if (!confirmed) return;
    
    this.showLoading(true);
    try {
      const updatedXml = await this.generateUpdatedXml();
      
      // 创建临时文件
      const tempFile = '/tmp/dax-temp.xml';
      const escapedXml = updatedXml.replace(/'/g, "'\"'\"'");
      
      // 写入临时文件
      const writeResult = await window.core.exec(`echo '${escapedXml}' > "${tempFile}"`);
      if (writeResult.errno !== 0) {
        throw new Error(`Failed to create temporary file: ${writeResult.stderr}`);
      }
      
      // 复制到目标位置
      const copyResult = await window.core.exec(`cp "${tempFile}" "${this.daxFilePath}"`);
      if (copyResult.errno !== 0) {
        throw new Error(`Failed to copy file to target location: ${copyResult.stderr}`);
      }
      
      // 清理临时文件
      await window.core.exec(`rm "${tempFile}"`);
      
      // 设置权限
      await window.core.exec(`chmod 644 "${this.daxFilePath}"`);
      
      this.data.isDirty = false;
      document.getElementById('save-btn').disabled = true;
      window.core.showToast(window.i18n.t('daxEqualizer.saveSuccess'), 'success');
      
      // 重新加载配置验证更改
      await this.loadDaxConfig();
      
    } catch (error) {
      window.core.showError(window.i18n.t('daxEqualizer.saveError'), error.message);
      window.core.logDebug(`Save error: ${error.message}`, 'DAX_EQ');
    }
    this.showLoading(false);
  }

  async generateUpdatedXml() {
    try {
      // 读取当前XML文件
      const result = await window.core.exec(`cat "${this.daxFilePath}"`);
      if (result.errno !== 0 || !result.stdout) {
        throw new Error(`Failed to read current XML file: ${result.stderr}`);
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(result.stdout, 'text/xml');
      
      // 更新当前选中的preset或创建新的
      if (this.data.currentPreset) {
        this.updateExistingPreset(xmlDoc);
      } else {
        this.createNewPreset(xmlDoc);
      }
      
      // 序列化XML
      const serializer = new XMLSerializer();
      let xmlString = serializer.serializeToString(xmlDoc);
      
      // 格式化XML
      xmlString = this.formatXml(xmlString);
      
      return xmlString;
    } catch (error) {
      window.core.logDebug(`XML generation error: ${error.message}`, 'DAX_EQ');
      throw error;
    }
  }

  updateExistingPreset(xmlDoc) {
    // 查找并更新现有preset
    const presets = xmlDoc.querySelectorAll('preset');
    let targetPreset = null;
    
    for (let preset of presets) {
      if (preset.getAttribute('id') === this.data.currentPreset.id) {
        targetPreset = preset;
        break;
      }
    }
    
    if (targetPreset) {
      this.updatePresetBands(xmlDoc, targetPreset);
    }
  }

  createNewPreset(xmlDoc) {
    // 创建新的preset（简单模式下）
    const profile = xmlDoc.querySelector('profile');
    if (!profile) return;
    
    const preset = xmlDoc.createElement('preset');
    preset.setAttribute('id', 'custom_preset');
    preset.setAttribute('type', 'geq');
    
    this.updatePresetBands(xmlDoc, preset);
    profile.appendChild(preset);
  }

  updatePresetBands(xmlDoc, preset) {
    // 清除现有频段
    const existingBands = preset.querySelectorAll('band_ieq, band_geq');
    existingBands.forEach(band => band.remove());
    
    // 查找或创建data容器
    let dataContainer = preset.querySelector('data');
    if (!dataContainer) {
      dataContainer = xmlDoc.createElement('data');
      preset.appendChild(dataContainer);
    }
    
    // 查找或创建频段容器
    const isIEQ = this.data.activeEqType === 'ieq' || this.data.mode === 'simple';
    const containerName = isIEQ ? 'ieq-bands' : 'graphic-equalizer-bands';
    let bandsContainer = dataContainer.querySelector(containerName);
    if (!bandsContainer) {
      bandsContainer = xmlDoc.createElement(containerName);
      dataContainer.appendChild(bandsContainer);
    }
    
    // 添加更新的频段
    this.data.bands.forEach(band => {
      const bandElement = xmlDoc.createElement(isIEQ ? 'band_ieq' : 'band_geq');
      bandElement.setAttribute('frequency', band.frequency.toString());
      
      if (isIEQ) {
        bandElement.setAttribute('target', Math.round(band.target || band.gain * 100).toString());
      } else {
        bandElement.setAttribute('gain', (band.gain || 0).toString());
      }
      
      bandsContainer.appendChild(bandElement);
    });
  }

  formatXml(xml) {
    // 简单的XML格式化
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
        // 自包含标签
        formatted += indent + node + '\n';
      } else if (node.match(/^<\w/)) {
        // 开始标签
        formatted += indent + node + '\n';
        indent += tab;
      } else if (node.match(/^<\//)) {
        // 结束标签
        indent = indent.substring(tab.length);
        formatted += indent + node + '\n';
      } else {
        // 内容或自闭合标签
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
    const backupPath = await window.DialogManager.showInput(
      window.i18n.t('daxEqualizer.restoreTitle'),
      window.i18n.t('daxEqualizer.restoreMessage'),
      window.i18n.t('daxEqualizer.restorePlaceholder')
    );
    
    if (!backupPath) return;
    
    try {
      const result = await window.core.exec(`cp "${backupPath}" "${this.daxFilePath}"`);
      if (result.errno === 0) {
        window.core.showToast(window.i18n.t('daxEqualizer.restoreSuccess'), 'success');
        await this.loadDaxConfig();
        this.renderEqualizer();
      } else {
        window.core.showError(window.i18n.t('daxEqualizer.restoreError'), result.stderr);
      }
    } catch (error) {
      window.core.showError(window.i18n.t('daxEqualizer.restoreError'), error.message);
    }
  }

  async showHelp() {
    await window.DialogManager.showGeneric({
      title: window.i18n.t('daxEqualizer.helpTitle'),
      content: `
        <div style="line-height: 1.6; color: var(--on-surface);">
          <p><strong>${window.i18n.t('daxEqualizer.simpleMode')}:</strong></p>
          <p>${window.i18n.t('daxEqualizer.helpSimple')}</p>
          <br>
          <p><strong>${window.i18n.t('daxEqualizer.advancedMode')}:</strong></p>
          <p>${window.i18n.t('daxEqualizer.helpContent1')}</p>
          <p>${window.i18n.t('daxEqualizer.helpContent2')}</p>
          <br>
          <p><strong>${window.i18n.t('daxEqualizer.helpTips')}:</strong></p>
          <p>${window.i18n.t('daxEqualizer.helpContent3')}</p>
        </div>
      `,
      buttons: [
        { text: window.i18n.t('common.close'), action: () => {} }
      ],
      closable: true
    });
  }

  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  cleanup() {
    // 清理事件监听器
    this.eventListeners.forEach(listener => {
      listener.element.removeEventListener(listener.event, listener.handler);
    });
    this.eventListeners = [];
  }
}

export { DaxequalizerPage };
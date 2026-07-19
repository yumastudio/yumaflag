import React from 'react';

const ControlSlider = ({ label, value, min, max, step, onChange, unit = '' }) => (
    <div className="input-row">
        <div className="input-label">
            <span>{label}</span>
            <span className="input-value">{typeof value === 'number' ? value.toFixed(2) : value}{unit}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
        />
    </div>
);

const Sidebar = ({ params, setParams, onUpload, onExport, isRecording, bgColor, setBgColor, applyPreset, exportDuration, setExportDuration }) => {

    const updateParam = (key, value) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const updateRotation = (axis, value) => {
        setParams(prev => ({
            ...prev,
            rotation: prev.rotation.map((v, i) => i === axis ? value : v)
        }));
    };

    return (
        <div className="sidebar">
            <h2>Editor Bendera Ultimate</h2>

            {/* Upload & Export */}
            <div className="control-group">
                <div className="control-group-title">Media & Ekspor</div>
                <label className="btn btn-secondary">
                    📂 Unggah Gambar
                    <input
                        type="file"
                        accept="image/*"
                        onChange={onUpload}
                        style={{ display: 'none' }}
                    />
                </label>

                <div className="recording-controls" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onExport.takeSnapshot}
                        disabled={isRecording}
                    >
                        📸 Ambil Foto 4K
                    </button>

                    <hr />

                    <ControlSlider
                        label="Durasi Render"
                        value={exportDuration}
                        min={1} max={30} step={1}
                        onChange={setExportDuration}
                        unit="s"
                    />

                    <button
                        className="btn"
                        onClick={onExport.startRender}
                        disabled={isRecording}
                    >
                        {isRecording && onExport.mode === 'render' ? `Mereder ${exportDuration}s...` : '🎬 Render Video 4K (HQ)'}
                    </button>
                    {!(isRecording && onExport.mode === 'render') && (
                        <small style={{ color: 'var(--text-tertiary)', fontSize: '0.7em', textAlign: 'center', marginTop: '-5px' }}>
                            *Hasil mulus 60fps, proses lebih lambat.
                        </small>
                    )}
                </div>
            </div>

            {/* Background Color */}
            <div className="control-group">
                <div className="control-group-title">Latar Belakang</div>
                <div className="input-row">
                    <div className="color-picker-wrapper">
                        <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => setBgColor(e.target.value)}
                        />
                        <div className="input-label" style={{ flex: 1 }}>
                            Warna: <span style={{ fontFamily: 'monospace', color: 'var(--accent-color)' }}>{bgColor}</span>
                        </div>
                    </div>
                    <div className="preset-container" style={{ marginTop: '8px' }}>
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '8px' }} onClick={() => setBgColor('#22c55e')}>Hijau</button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '8px' }} onClick={() => setBgColor('#3b82f6')}>Biru</button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '8px' }} onClick={() => setBgColor('#0f0f11')}>Gelap</button>
                    </div>
                </div>
            </div>

            {/* Presets */}
            <div className="control-group">
                <div className="control-group-title">Preset Animasi</div>
                <div className="preset-container">
                    <button className="btn btn-secondary" onClick={() => applyPreset('strong')}>⚡ Badai</button>
                    <button className="btn btn-secondary" onClick={() => applyPreset('soft')}>🧣 Sutra</button>
                    <button className="btn btn-secondary" onClick={() => applyPreset('balanced')}>⚖️ Normal</button>
                </div>
            </div>

            {/* Physics/Material */}
            <div className="control-group">
                <div className="control-group-title">Fisika & Material</div>
                <ControlSlider
                    label="Kecepatan Angin"
                    value={params.speed}
                    min={0} max={5} step={0.1}
                    onChange={(v) => updateParam('speed', v)}
                />
                <ControlSlider
                    label="Tinggi Ombak"
                    value={params.amplitude}
                    min={0} max={2} step={0.05}
                    onChange={(v) => updateParam('amplitude', v)}
                />
                <ControlSlider
                    label="Frekuensi"
                    value={params.frequency}
                    min={0.5} max={10} step={0.1}
                    onChange={(v) => updateParam('frequency', v)}
                />
                <ControlSlider
                    label="Noise (Lipatan)"
                    value={params.noiseStrength}
                    min={0} max={2} step={0.05}
                    onChange={(v) => updateParam('noiseStrength', v)}
                />
                <ControlSlider
                    label="Kilap (Specular)"
                    value={params.specularStrength}
                    min={0} max={1} step={0.05}
                    onChange={(v) => updateParam('specularStrength', v)}
                />
                <ControlSlider
                    label="Transparansi"
                    value={params.translucencyStrength}
                    min={0} max={1} step={0.05}
                    onChange={(v) => updateParam('translucencyStrength', v)}
                />
            </div>

            {/* Transform */}
            <div className="control-group">
                <div className="control-group-title">Transformasi</div>
                <ControlSlider
                    label="Skala"
                    value={params.scale}
                    min={0.1} max={5} step={0.1}
                    onChange={(v) => updateParam('scale', v)}
                />
                <ControlSlider
                    label="Posisi X"
                    value={params.positionX}
                    min={-5} max={5} step={0.1}
                    onChange={(v) => updateParam('positionX', v)}
                />
                <ControlSlider
                    label="Posisi Y"
                    value={params.positionY}
                    min={-5} max={5} step={0.1}
                    onChange={(v) => updateParam('positionY', v)}
                />
                <ControlSlider
                    label="Rotasi X"
                    value={params.rotation[0]}
                    min={-1.5} max={1.5} step={0.05}
                    onChange={(v) => updateRotation(0, v)}
                    unit="rad"
                />
                <ControlSlider
                    label="Rotasi Y"
                    value={params.rotation[1]}
                    min={-3.14} max={3.14} step={0.1}
                    onChange={(v) => updateRotation(1, v)}
                    unit="rad"
                />
                <ControlSlider
                    label="Rotasi Z"
                    value={params.rotation[2]}
                    min={-1.5} max={1.5} step={0.05}
                    onChange={(v) => updateRotation(2, v)}
                    unit="rad"
                />
            </div>

            {/* Scene Settings */}
            <div className="control-group">
                <div className="control-group-title">Kamera & Kualitas</div>
                <ControlSlider
                    label="FOV Kamera"
                    value={params.fov}
                    min={10} max={100} step={1}
                    onChange={(v) => updateParam('fov', v)}
                />

                <div className="input-row" style={{ marginTop: '10px' }}>
                    <div className="input-label" style={{ marginBottom: '8px' }}>Kualitas Preview</div>
                    <div className="preset-container">
                        {['low', 'medium', 'high'].map(q => (
                            <button
                                key={q}
                                className={`btn btn-secondary ${params.quality === q ? 'active' : ''}`}
                                style={{
                                    padding: '8px',
                                    fontSize: '0.8rem',
                                    justifyContent: 'center'
                                }}
                                onClick={() => updateParam('quality', q)}
                            >
                                {q === 'low' ? 'Rendah' : q === 'medium' ? 'Sedang' : 'Tinggi'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;

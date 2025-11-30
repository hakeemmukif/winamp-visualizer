import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { AudioData } from '../types';
import { synthwaveGridShader, synthwaveSunShader, ambienceShader, batteryShader } from './shaders/synthwave';

export type VisualizerType = 'bars' | 'waveform' | 'particles' | 'tunnel' | 'ambience' | 'battery';

export class VisualizerScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private container: HTMLElement;
  private animationId: number = 0;
  private clock: THREE.Clock;

  // Visualizer elements
  private bars: THREE.Mesh[] = [];
  private waveformLine: THREE.Line | null = null;
  private particles: THREE.Points | null = null;
  private tunnel: THREE.Mesh | null = null;
  private grid: THREE.Mesh | null = null;
  private sun: THREE.Mesh | null = null;
  private ambiencePlane: THREE.Mesh | null = null;
  private batteryPlane: THREE.Mesh | null = null;

  private currentType: VisualizerType = 'bars';
  private time = 0;

  // Colors
  private readonly colors = {
    neonPink: new THREE.Color(0xff00ff),
    neonCyan: new THREE.Color(0x00ffff),
    neonPurple: new THREE.Color(0x9d00ff),
    deepBlue: new THREE.Color(0x000033),
    hotPink: new THREE.Color(0xff1493),
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0014);
    this.scene.fog = new THREE.FogExp2(0x0a0014, 0.015);

    // Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 5, 20);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    container.appendChild(this.renderer.domElement);

    // Post-processing
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      1.5, // strength
      0.4, // radius
      0.85 // threshold
    );
    this.composer.addPass(bloomPass);

    // Initialize scene elements
    this.createSynthwaveEnvironment();
    this.createBars();

    // Handle resize
    window.addEventListener('resize', this.handleResize);
  }

  private createSynthwaveEnvironment(): void {
    // Grid floor
    const gridGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    const gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: this.colors.neonPink },
        uColor2: { value: this.colors.neonCyan },
      },
      vertexShader: synthwaveGridShader.vertex,
      fragmentShader: synthwaveGridShader.fragment,
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.grid = new THREE.Mesh(gridGeometry, gridMaterial);
    this.grid.rotation.x = -Math.PI / 2;
    this.grid.position.y = -2;
    this.scene.add(this.grid);

    // Sun
    const sunGeometry = new THREE.CircleGeometry(15, 64);
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: synthwaveSunShader.vertex,
      fragmentShader: synthwaveSunShader.fragment,
      transparent: true,
    });

    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sun.position.set(0, 8, -50);
    this.scene.add(this.sun);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    // Point lights
    const pinkLight = new THREE.PointLight(0xff00ff, 2, 100);
    pinkLight.position.set(-20, 10, -10);
    this.scene.add(pinkLight);

    const cyanLight = new THREE.PointLight(0x00ffff, 2, 100);
    cyanLight.position.set(20, 10, -10);
    this.scene.add(cyanLight);
  }

  private createBars(): void {
    const barCount = 64;
    const barWidth = 0.4;
    const barSpacing = 0.5;
    const totalWidth = barCount * (barWidth + barSpacing);
    const startX = -totalWidth / 2;

    for (let i = 0; i < barCount; i++) {
      const geometry = new THREE.BoxGeometry(barWidth, 1, barWidth);
      const hue = i / barCount;
      const color = new THREE.Color().setHSL(hue * 0.3 + 0.8, 1, 0.5);

      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
      });

      const bar = new THREE.Mesh(geometry, material);
      bar.position.x = startX + i * (barWidth + barSpacing);
      bar.position.y = 0;
      bar.position.z = 0;
      this.scene.add(bar);
      this.bars.push(bar);
    }
  }

  private createWaveform(): void {
    const points = [];
    for (let i = 0; i < 256; i++) {
      points.push(new THREE.Vector3((i - 128) * 0.2, 0, 0));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: this.colors.neonCyan,
      linewidth: 2,
    });

    this.waveformLine = new THREE.Line(geometry, material);
    this.waveformLine.visible = false;
    this.scene.add(this.waveformLine);
  }

  private createParticles(): void {
    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      const color = new THREE.Color().setHSL(Math.random() * 0.3 + 0.8, 1, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.visible = false;
    this.scene.add(this.particles);
  }

  private createTunnel(): void {
    const geometry = new THREE.CylinderGeometry(10, 10, 100, 32, 20, true);
    const material = new THREE.MeshBasicMaterial({
      color: this.colors.neonPurple,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });

    this.tunnel = new THREE.Mesh(geometry, material);
    this.tunnel.rotation.x = Math.PI / 2;
    this.tunnel.position.z = -30;
    this.tunnel.visible = false;
    this.scene.add(this.tunnel);
  }

  private createAmbience(): void {
    const geometry = new THREE.PlaneGeometry(50, 30);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMids: { value: 0 },
        uHighs: { value: 0 },
        uAverage: { value: 0 },
      },
      vertexShader: ambienceShader.vertex,
      fragmentShader: ambienceShader.fragment,
    });

    this.ambiencePlane = new THREE.Mesh(geometry, material);
    this.ambiencePlane.position.z = -5;
    this.ambiencePlane.visible = false;
    this.scene.add(this.ambiencePlane);
  }

  private createBattery(): void {
    const geometry = new THREE.PlaneGeometry(50, 30);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMids: { value: 0 },
        uHighs: { value: 0 },
        uAverage: { value: 0 },
        uPreset: { value: 0 },
      },
      vertexShader: batteryShader.vertex,
      fragmentShader: batteryShader.fragment,
    });

    this.batteryPlane = new THREE.Mesh(geometry, material);
    this.batteryPlane.position.z = -5;
    this.batteryPlane.visible = false;
    this.scene.add(this.batteryPlane);
  }

  setVisualizerType(type: VisualizerType): void {
    this.currentType = type;

    // Determine if we should show synthwave environment
    const showSynthwave = type === 'bars' || type === 'waveform' || type === 'particles' || type === 'tunnel';

    // Toggle synthwave environment
    if (this.grid) this.grid.visible = showSynthwave;
    if (this.sun) this.sun.visible = showSynthwave;

    // Hide all visualizer elements
    this.bars.forEach(bar => (bar.visible = type === 'bars'));

    if (!this.waveformLine) this.createWaveform();
    if (this.waveformLine) this.waveformLine.visible = type === 'waveform';

    if (!this.particles) this.createParticles();
    if (this.particles) this.particles.visible = type === 'particles';

    if (!this.tunnel) this.createTunnel();
    if (this.tunnel) this.tunnel.visible = type === 'tunnel';

    // WMP-style visualizers
    if (!this.ambiencePlane) this.createAmbience();
    if (this.ambiencePlane) this.ambiencePlane.visible = type === 'ambience';

    if (!this.batteryPlane) this.createBattery();
    if (this.batteryPlane) this.batteryPlane.visible = type === 'battery';

    // Adjust camera for WMP modes
    if (type === 'ambience' || type === 'battery') {
      this.camera.position.set(0, 0, 15);
      this.camera.lookAt(0, 0, 0);
    } else {
      this.camera.position.set(0, 5, 20);
      this.camera.lookAt(0, 0, 0);
    }
  }

  update(audioData: AudioData | null): void {
    this.time += this.clock.getDelta();

    // Update grid shader
    if (this.grid) {
      (this.grid.material as THREE.ShaderMaterial).uniforms.uTime.value = this.time;
    }

    // Update sun shader
    if (this.sun) {
      (this.sun.material as THREE.ShaderMaterial).uniforms.uTime.value = this.time;
    }

    if (!audioData) {
      // Idle animation
      this.updateIdle();
      return;
    }

    switch (this.currentType) {
      case 'bars':
        this.updateBars(audioData);
        break;
      case 'waveform':
        this.updateWaveform(audioData);
        break;
      case 'particles':
        this.updateParticles(audioData);
        break;
      case 'tunnel':
        this.updateTunnel(audioData);
        break;
      case 'ambience':
        this.updateAmbience(audioData);
        break;
      case 'battery':
        this.updateBattery(audioData);
        break;
    }

    // Camera movement based on bass (only for synthwave modes)
    if (this.currentType !== 'ambience' && this.currentType !== 'battery') {
      this.camera.position.z = 20 + audioData.bass * 3;
      this.camera.position.y = 5 + Math.sin(this.time * 0.5) * audioData.mids * 2;
    }
  }

  private updateIdle(): void {
    // Gentle animation when no audio
    this.bars.forEach((bar, i) => {
      const scale = 0.5 + Math.sin(this.time * 2 + i * 0.1) * 0.3;
      bar.scale.y = scale;
      bar.position.y = scale / 2;
    });

    // Update WMP visualizers with gentle idle animation
    const idleData: AudioData = {
      frequencyData: new Uint8Array(0),
      timeDomainData: new Uint8Array(0),
      bass: 0.2 + Math.sin(this.time * 0.5) * 0.1,
      mids: 0.15 + Math.sin(this.time * 0.7) * 0.08,
      highs: 0.1 + Math.sin(this.time * 0.9) * 0.05,
      average: 0.15 + Math.sin(this.time * 0.6) * 0.08,
    };

    if (this.currentType === 'ambience') {
      this.updateAmbience(idleData);
    } else if (this.currentType === 'battery') {
      this.updateBattery(idleData);
    }
  }

  private updateBars(audioData: AudioData): void {
    const { frequencyData } = audioData;
    const step = Math.floor(frequencyData.length / this.bars.length);

    this.bars.forEach((bar, i) => {
      const value = frequencyData[i * step] / 255;
      const scale = Math.max(0.1, value * 15);
      bar.scale.y = scale;
      bar.position.y = scale / 2;

      // Update emissive intensity based on value
      const material = bar.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.3 + value * 0.7;
    });
  }

  private updateWaveform(audioData: AudioData): void {
    if (!this.waveformLine) return;

    const { timeDomainData } = audioData;
    const positions = this.waveformLine.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < Math.min(256, timeDomainData.length); i++) {
      const value = (timeDomainData[i] - 128) / 128;
      positions.setY(i, value * 5);
    }

    positions.needsUpdate = true;
  }

  private updateParticles(audioData: AudioData): void {
    if (!this.particles) return;

    const positions = this.particles.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < positions.count; i++) {
      const freqIndex = i % audioData.frequencyData.length;
      const value = audioData.frequencyData[freqIndex] / 255;

      // Move particles based on audio
      positions.setY(
        i,
        positions.getY(i) + (value - 0.5) * 0.5 + Math.sin(this.time + i) * 0.1
      );

      // Reset particles that go too far
      if (positions.getY(i) > 25 || positions.getY(i) < -25) {
        positions.setY(i, (Math.random() - 0.5) * 50);
      }
    }

    positions.needsUpdate = true;
    this.particles.rotation.y += 0.001 + audioData.bass * 0.01;
  }

  private updateTunnel(audioData: AudioData): void {
    if (!this.tunnel) return;

    this.tunnel.rotation.z += 0.005 + audioData.bass * 0.02;
    this.tunnel.scale.x = 1 + audioData.bass * 0.3;
    this.tunnel.scale.y = 1 + audioData.bass * 0.3;

    const material = this.tunnel.material as THREE.MeshBasicMaterial;
    material.opacity = 0.3 + audioData.average * 0.5;
  }

  private updateAmbience(audioData: AudioData): void {
    if (!this.ambiencePlane) return;

    const material = this.ambiencePlane.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = this.time;
    material.uniforms.uBass.value = audioData.bass;
    material.uniforms.uMids.value = audioData.mids;
    material.uniforms.uHighs.value = audioData.highs;
    material.uniforms.uAverage.value = audioData.average;
  }

  private updateBattery(audioData: AudioData): void {
    if (!this.batteryPlane) return;

    const material = this.batteryPlane.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = this.time;
    material.uniforms.uBass.value = audioData.bass;
    material.uniforms.uMids.value = audioData.mids;
    material.uniforms.uHighs.value = audioData.highs;
    material.uniforms.uAverage.value = audioData.average;
  }

  render(): void {
    this.composer.render();
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  };

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.handleResize);

    this.scene.clear();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

export const synthwaveGridShader = {
  vertex: `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;

    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      // Create grid lines
      vec2 grid = abs(fract(vPosition.xy * 0.1 - uTime * 0.1) - 0.5);
      float line = min(grid.x, grid.y);
      float gridLine = 1.0 - smoothstep(0.0, 0.05, line);

      // Distance fade
      float dist = length(vPosition.xy) * 0.01;
      float fade = 1.0 - smoothstep(0.0, 1.0, dist);

      // Color gradient
      vec3 color = mix(uColor1, uColor2, vUv.y);

      // Final output
      float alpha = gridLine * fade * 0.8;
      gl_FragColor = vec4(color, alpha);
    }
  `,
};

export const synthwaveSunShader = {
  vertex: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform float uTime;

    varying vec2 vUv;

    void main() {
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(vUv, center);

      // Sun gradient - orange to pink
      vec3 colorTop = vec3(1.0, 0.8, 0.0);    // Yellow/Orange
      vec3 colorMid = vec3(1.0, 0.2, 0.5);    // Hot pink
      vec3 colorBot = vec3(0.8, 0.0, 0.8);    // Purple

      float y = vUv.y;
      vec3 sunColor;
      if (y > 0.5) {
        sunColor = mix(colorMid, colorTop, (y - 0.5) * 2.0);
      } else {
        sunColor = mix(colorBot, colorMid, y * 2.0);
      }

      // Horizontal stripes (classic sun effect)
      float stripes = step(0.5, fract(vUv.y * 15.0 - uTime * 0.2));
      float stripeMask = smoothstep(0.3, 0.5, 1.0 - vUv.y);
      sunColor = mix(sunColor, sunColor * 0.3, stripes * stripeMask);

      // Soft edge
      float edge = 1.0 - smoothstep(0.4, 0.5, dist);

      // Glow
      float glow = 1.0 - smoothstep(0.3, 0.6, dist);
      vec3 glowColor = vec3(1.0, 0.3, 0.5) * glow * 0.5;

      vec3 finalColor = sunColor * edge + glowColor;
      float alpha = max(edge, glow * 0.3);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

export const barGlowShader = {
  vertex: `
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      vPosition = position;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uTime;

    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      // Fresnel effect for edge glow
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);

      // Pulsing glow
      float pulse = 0.8 + sin(uTime * 3.0) * 0.2;

      vec3 color = uColor * (1.0 + fresnel * uIntensity * pulse);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export const particleShader = {
  vertex: `
    uniform float uTime;
    uniform float uBass;

    attribute float aScale;
    attribute vec3 aRandomness;

    varying vec3 vColor;

    void main() {
      vec3 pos = position;

      // Add movement based on audio
      pos += aRandomness * sin(uTime + position.x) * uBass;

      vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
      vec4 viewPosition = viewMatrix * modelPosition;
      vec4 projectedPosition = projectionMatrix * viewPosition;

      gl_Position = projectedPosition;
      gl_PointSize = aScale * (300.0 / -viewPosition.z);

      // Pass color based on position
      vColor = vec3(
        0.5 + sin(position.x * 0.1) * 0.5,
        0.5 + sin(position.y * 0.1) * 0.5,
        1.0
      );
    }
  `,
  fragment: `
    varying vec3 vColor;

    void main() {
      // Circular point
      float dist = distance(gl_PointCoord, vec2(0.5));
      if (dist > 0.5) discard;

      float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

      gl_FragColor = vec4(vColor, alpha);
    }
  `,
};

export const tunnelShader = {
  vertex: `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMids;

    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      // Create tunnel rings
      float rings = fract(vUv.y * 20.0 - uTime * 2.0);
      rings = smoothstep(0.0, 0.1, rings) * smoothstep(0.2, 0.1, rings);

      // Radial lines
      float angle = atan(vPosition.x, vPosition.z);
      float lines = fract(angle * 8.0 / 3.14159);
      lines = smoothstep(0.0, 0.1, lines) * smoothstep(0.2, 0.1, lines);

      // Combine patterns
      float pattern = max(rings, lines);

      // Colors
      vec3 color1 = vec3(1.0, 0.0, 1.0); // Magenta
      vec3 color2 = vec3(0.0, 1.0, 1.0); // Cyan
      vec3 color = mix(color1, color2, vUv.y + sin(uTime) * 0.3);

      // Audio reactivity
      float intensity = 0.5 + uBass * 0.5 + uMids * 0.3;

      gl_FragColor = vec4(color * pattern * intensity, pattern * 0.8);
    }
  `,
};

export const crtShader = {
  vertex: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uScanlineIntensity;
    uniform float uNoiseIntensity;

    varying vec2 vUv;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;

      // Barrel distortion
      vec2 center = uv - 0.5;
      float dist = length(center);
      uv = center * (1.0 + dist * dist * 0.1) + 0.5;

      // Sample the texture
      vec4 color = texture2D(tDiffuse, uv);

      // Scanlines
      float scanline = sin(uv.y * 800.0) * 0.5 + 0.5;
      scanline = pow(scanline, 1.5) * uScanlineIntensity;
      color.rgb -= scanline * 0.15;

      // Noise
      float noise = random(uv + uTime) * uNoiseIntensity;
      color.rgb += noise * 0.05;

      // Vignette
      float vignette = 1.0 - dist * 0.5;
      color.rgb *= vignette;

      // RGB shift (chromatic aberration)
      float shift = 0.002;
      color.r = texture2D(tDiffuse, uv + vec2(shift, 0.0)).r;
      color.b = texture2D(tDiffuse, uv - vec2(shift, 0.0)).b;

      gl_FragColor = color;
    }
  `,
};

// WMP Ambience-style shader - soft flowing waves with color cycling
export const ambienceShader = {
  vertex: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMids;
    uniform float uHighs;
    uniform float uAverage;
    uniform sampler2D uFrequencyData;

    varying vec2 vUv;

    // HSV to RGB conversion
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = uv - 0.5;

      // Slow color cycling through spectrum
      float hue = fract(uTime * 0.05 + uv.x * 0.2);

      // Create flowing wave distortion
      float wave1 = sin(uv.x * 6.0 + uTime * 0.8 + uBass * 3.0) * 0.1;
      float wave2 = sin(uv.y * 8.0 + uTime * 0.6 + uMids * 2.0) * 0.08;
      float wave3 = cos(uv.x * 4.0 - uTime * 0.4) * sin(uv.y * 5.0 + uTime * 0.5) * 0.12;

      // Combine waves
      float displacement = wave1 + wave2 + wave3;

      // Create soft flowing pattern
      float pattern = sin((uv.x + displacement) * 10.0 + uTime) * 0.5 + 0.5;
      pattern *= sin((uv.y + displacement * 0.5) * 8.0 - uTime * 0.7) * 0.5 + 0.5;

      // Audio-reactive intensity
      float intensity = 0.3 + uAverage * 0.7 + uBass * 0.4;

      // Color with saturation based on audio
      float saturation = 0.6 + uHighs * 0.4;
      vec3 color = hsv2rgb(vec3(hue, saturation, pattern * intensity));

      // Add glow for high bass
      float glow = uBass * 0.3 * (1.0 - length(center) * 1.5);
      color += vec3(glow * 0.5, glow * 0.3, glow);

      // Soft vignette
      float vignette = 1.0 - length(center) * 0.8;
      color *= vignette;

      // White flash on loud peaks
      float flash = smoothstep(0.7, 0.9, uAverage) * 0.3;
      color += vec3(flash);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// WMP Battery-style shader - kaleidoscope/tunnel with spectrograms
export const batteryShader = {
  vertex: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMids;
    uniform float uHighs;
    uniform float uAverage;
    uniform int uPreset;

    varying vec2 vUv;

    #define PI 3.14159265359

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    // Kaleidoscope effect
    vec2 kaleidoscope(vec2 uv, float segments) {
      vec2 centered = uv - 0.5;
      float angle = atan(centered.y, centered.x);
      float radius = length(centered);

      angle = mod(angle, PI * 2.0 / segments);
      angle = abs(angle - PI / segments);

      return vec2(cos(angle), sin(angle)) * radius + 0.5;
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = uv - 0.5;
      float dist = length(center);
      float angle = atan(center.y, center.x);

      // Kaleidoscope segments based on audio
      float segments = 6.0 + floor(uBass * 6.0);
      vec2 kalUv = kaleidoscope(uv, segments);

      // Tunnel zoom effect
      float tunnelZ = 1.0 / (dist + 0.1) + uTime * 0.5;
      float tunnelAngle = angle + uTime * 0.2 + uMids * 0.5;

      // Create radial rays
      float rays = sin(tunnelAngle * 8.0) * 0.5 + 0.5;
      rays *= sin(tunnelZ * 4.0) * 0.5 + 0.5;

      // Spiral pattern
      float spiral = sin(angle * 4.0 + dist * 20.0 - uTime * 2.0 - uBass * 5.0);
      spiral = smoothstep(-0.2, 0.2, spiral);

      // Combine patterns
      float pattern = mix(rays, spiral, 0.5 + sin(uTime * 0.3) * 0.3);

      // Color cycling
      float hue = fract(uTime * 0.1 + dist * 0.5 + angle / (PI * 2.0));
      float saturation = 0.8 + uHighs * 0.2;
      float brightness = pattern * (0.5 + uAverage * 0.5);

      vec3 color = hsv2rgb(vec3(hue, saturation, brightness));

      // Add starburst on beats
      float starburst = pow(max(0.0, 1.0 - dist * 2.0), 2.0) * uBass;
      color += vec3(starburst * 0.8, starburst * 0.6, starburst);

      // Pulsing rings
      float rings = sin(dist * 30.0 - uTime * 3.0 - uBass * 10.0);
      rings = smoothstep(0.8, 1.0, rings) * uMids;
      color += vec3(rings * 0.3, rings * 0.5, rings * 0.8);

      // Edge glow
      float edgeGlow = smoothstep(0.3, 0.5, dist) * (1.0 - smoothstep(0.5, 0.7, dist));
      color += vec3(0.2, 0.0, 0.4) * edgeGlow * uAverage;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// WMP Bars and Waves style - classic spectrum analyzer
export const barsAndWavesShader = {
  vertex: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMids;
    uniform float uHighs;
    uniform float uAverage;
    uniform float uFrequencies[64];

    varying vec2 vUv;

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      vec2 uv = vUv;

      // Get frequency bar index
      int barIndex = int(uv.x * 64.0);
      float freqValue = uFrequencies[barIndex];

      // Create bar with smooth edges
      float barHeight = freqValue;
      float bar = smoothstep(barHeight - 0.02, barHeight, uv.y);
      bar = 1.0 - bar;

      // Color gradient based on frequency
      float hue = uv.x * 0.3 + 0.6; // Blue to magenta range
      vec3 barColor = hsv2rgb(vec3(hue, 0.9, 1.0));

      // Add peak indicator
      float peak = smoothstep(barHeight - 0.03, barHeight - 0.01, uv.y) *
                   (1.0 - smoothstep(barHeight - 0.01, barHeight + 0.01, uv.y));
      vec3 peakColor = vec3(1.0, 1.0, 1.0);

      // Combine
      vec3 color = bar * barColor + peak * peakColor;

      // Background glow
      float bgGlow = uAverage * 0.1;
      color += vec3(bgGlow * 0.2, bgGlow * 0.1, bgGlow * 0.3);

      // Reflection effect
      if (uv.y < 0.15) {
        float reflectY = 0.15 - uv.y;
        float reflectBar = smoothstep(barHeight - 0.02, barHeight, reflectY * 5.0);
        reflectBar = 1.0 - reflectBar;
        color += barColor * reflectBar * 0.3 * (1.0 - reflectY / 0.15);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

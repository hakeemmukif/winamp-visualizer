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

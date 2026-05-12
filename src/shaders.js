
// Base Fragment Shader Source
export const IMAGE_SHADER_SOURCE = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uSpecularStrength;
  uniform float uTranslucencyStrength;
  uniform float uLightIntensity;
  
  varying vec2 vUv;
  varying vec3 vViewPosition;

  void main() {
    vec4 textureColor = texture2D(uTexture, vUv);
    
    // 1. Calculate Normal dynamically using derivatives
    vec3 fdx = dFdx(vViewPosition);
    vec3 fdy = dFdy(vViewPosition);
    vec3 normal = normalize(cross(fdx, fdy));

    // 2. Lighting Setup
    vec3 lightDir = normalize(vec3(5.0, 5.0, 10.0)); // Directional Light
    vec3 viewDir = normalize(vViewPosition);
    
    // Ambient
    float ambientStrength = 0.4;
    vec3 ambient = ambientStrength * textureColor.rgb * uLightIntensity;
    
    // Diffuse (Lambert)
    float diff = max(dot(normal, lightDir), 0.0);
    
    // Translucency (backside lighting / thinness)
    // Controlled by uTranslucencyStrength
    float translucency = uTranslucencyStrength * max(dot(-normal, lightDir), 0.0);
    vec3 diffuse = (diff + translucency) * textureColor.rgb * uLightIntensity;
    
    // Specular (Blinn-Phong)
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfwayDir), 0.0), 32.0); 
    // Controlled by uSpecularStrength
    vec3 specular = vec3(uSpecularStrength) * spec * uLightIntensity; 
    
    // Fresnel (Rim Lighting) 
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    // Scale rim light with glossiness so matte flags don't glow on edges
    vec3 rim = vec3(uSpecularStrength * 0.5) * fresnel * uLightIntensity;

    // Combine
    vec3 finalColor = ambient + diffuse + specular + rim;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Memodifikasi source shader dengan menyuntikkan define atau logika tambahan.
 * @param {string} source - Source code shader asli
 * @param {object} config - Konfigurasi untuk injeksi (saat ini belum ada logika khusus, tapi disiapkan)
 * @returns {string} - Source code shader yang telah dimodifikasi
 */
export const modifyImageShader = (source, _config = {}) => {
  // Contoh implementasi sederhana: 
  // Kita bisa menyuntikkan #define atau kode lain di sini menggunakan replace.

  // Untuk saat ini, kita kembalikan source aslinya karena belum ada logika khusus yang diminta 
  // selain memindahkan shader ke sini. 
  // Nanti bisa ditambahkan logika regex seperti:
  // let modified = source.replace('void main() {', 'uniform float uCustom;\\nvoid main() {');

  return source;
};

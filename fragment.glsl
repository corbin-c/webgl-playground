precision mediump float;
uniform sampler2D u_image;

varying vec2 v_texCoord;
varying float v_wave;

void main() {
  //~ float wave = v_wave * .1;
  //~ float r = texture2D(u_image, v_texCoord).r;
  //~ float g = texture2D(u_image, v_texCoord - wave).g;
  //~ float b = texture2D(u_image, v_texCoord + wave).b;
  //~ vec3 texture = vec3(r, g, b);
  //~ gl_FragColor = vec4(texture, 1.);
   gl_FragColor = texture2D(u_image, v_texCoord);
}

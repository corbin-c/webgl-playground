class Gl {
  constructor(canvas=null) {
    if (canvas) {
      this.c = canvas;
    } else {
      this.c = document.createElement("canvas");
      document.body.append(this.c);
    }
    this.resize();
    window.addEventListener("resize",() => {
      this.resize();
      this.init();
    });
    this.gl = this.c.getContext("webgl") || this.c.getContext("experimental-webgl");
    this.createProgram(vertex,fragment);
    this.init();
  }
  init() {
    // look up where the vertex data needs to go.
    this.initBuffers();
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.viewport(0, 0, this.width, this.height);
    let imgs = [...document.querySelectorAll("img")];
    let textures = [];
    imgs.forEach(image => {
      textures.push(this.createTexFromImage(image));
    });
    Promise.all(textures).then(textures => {
      textures.forEach(tex => {
        tex.position = tex.img.getBoundingClientRect();
        this.drawImage(tex.texture,
          tex.position.width,
          tex.position.height,
          tex.position.left,
          tex.position.top);
      });
    });
  }
  resize() {
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    this.c.height = vh;
    this.c.width = vw;
  }
  get width() {
    return this.c.width;
  }
  get height() {
    return this.c.height;    
  }
  initBuffers() {
    this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
    this.texcoordLocation = this.gl.getAttribLocation(this.program, "a_texCoord");
    this.matrixLocation = this.gl.getUniformLocation(this.program, "u_matrix");
    this.textureLocation = this.gl.getUniformLocation(this.program, "u_texture");

    // Create a buffer.
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

    // Put a unit quad in the buffer
    let positions = [
      0, 0,
      0, 1,
      1, 0,
      1, 0,
      0, 1,
      1, 1,
    ];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    // Create a buffer for texture coords
    this.texcoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texcoordBuffer);

    // Put texcoords in the buffer
    this.texcoords = [
      0, 0,
      0, 1,
      1, 0,
      1, 0,
      0, 1,
      1, 1,
    ];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.texcoords), this.gl.STATIC_DRAW);
  }
  createProgram(vertexShader, fragmentShader) {
    vertexShader = this.compileShader(vertexShader, this.gl.VERTEX_SHADER);
    fragmentShader = this.compileShader(fragmentShader, this.gl.FRAGMENT_SHADER);
    let program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw ("program failed to link:" + this.gl.getProgramInfoLog(program));
    }
    this.program = program;
  }
  compileShader(shaderSource, shaderType) {
    let shader = this.gl.createShader(shaderType);
    this.gl.shaderSource(shader, shaderSource);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw "could not compile shader:" + this.gl.getShaderInfoLog(shader);
    }
    return shader;
  }
  createTexFromImage(img) { //img should be loaded
    var tex = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
   
    // let's assume all images are not a power of 2
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    let mkTexture = () => {
      var textureInfo = {
        img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        texture: tex,
      };
      this.gl.bindTexture(this.gl.TEXTURE_2D, textureInfo.texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
      return textureInfo;
    }
    if (img.complete && img.naturalHeight !== 0) {
      return mkTexture();
    } else {
      return new Promise(resolve => {
        img.addEventListener("load", () => {
          resolve(mkTexture());
        });
      });
    }
  }
  drawImage(tex, texWidth, texHeight, dstX, dstY) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    // Tell WebGL to use our shader program pair
    this.gl.useProgram(this.program);
   
    // Setup the attributes to pull data from our buffers
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texcoordBuffer);
    this.gl.enableVertexAttribArray(this.texcoordLocation);
    this.gl.vertexAttribPointer(this.texcoordLocation, 2, this.gl.FLOAT, false, 0, 0);
   
    // this matrix will convert from pixels to clip space
    let matrix = m4.orthographic(0, this.width, this.height, 0, -1, 1);
   
    // this matrix will translate our quad to dstX, dstY
    matrix = m4.translate(matrix, dstX, dstY, 0);
   
    // this matrix will scale our 1 unit quad
    // from 1 unit to texWidth, texHeight units
    matrix = m4.scale(matrix, texWidth, texHeight, 1);
   
    // Set the matrix.
    this.gl.uniformMatrix4fv(this.matrixLocation, false, matrix);
   
    // Tell the shader to get the texture from texture unit 0
    this.gl.uniform1i(this.textureLocation, 0);
   
    // draw the quad (2 triangles, 6 vertices)
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }
  mkView(x,y,width,height,img) {
    let array = [
        x/img.width,  y/img.height,
        (x+width)/img.width,  y/img.height,
        x/img.width,  (y+height)/img.height,
        x/img.width,  (y+height)/img.height,
        (x+width)/img.width,  y/img.height,
        (x+width)/img.width,  (y+height)/img.height,
    ];
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(array),
      this.gl.STATIC_DRAW);
  }
  setRectangle(x, y, width, height) {
    var x1 = x;
    var x2 = x + width;
    var y1 = y;
    var y2 = y + height;
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
       x1, y1,
       x2, y1,
       x1, y2,
       x1, y2,
       x2, y1,
       x2, y2,
    ]), this.gl.STATIC_DRAW);
  }
}
let vertex = `attribute vec4 a_position;
attribute vec2 a_texCoord;
 
uniform mat4 u_matrix;
 
varying vec2 v_texCoord;
 
void main() {
   gl_Position = u_matrix * a_position;
   v_texCoord = a_texCoord;
}`;
let fragment = `precision mediump float;

// our texture
uniform sampler2D u_image;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

void main() {
   gl_FragColor = texture2D(u_image, v_texCoord);
}`;
let g = new Gl();

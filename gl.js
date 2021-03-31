class Gl {
  constructor(canvas=null) {
    if (canvas) {
      this.c = canvas;
    } else {
      this.c = document.createElement("canvas");
      document.body.append(this.c);
    }
    window.addEventListener("resize",() => {
      this.resize();
      this.render();
    });
    this.gl = this.c.getContext("webgl") || this.c.getContext("experimental-webgl");
    this.createProgram(vertex,fragment);
    this.c.addEventListener("mousemove",(event) => { this.trackMouse(event) });
    this.init();
    this.resize();
    this.mouse = { x: this.width/2, y: this.height/2 };
    this.render();
  }
  init() {
    this.initBuffers();
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    let imgs = [...document.querySelectorAll("img")];
    this.textures = [];
    imgs.forEach(image => {
      this.textures.push(this.createTexFromImage(image));
    });
  }
  render(time) {
    Promise.all(this.textures).then(textures => {
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
    this.gl.viewport(0, 0, this.width, this.height);
  }
  get width() {
    return this.c.width;
  }
  get height() {
    return this.c.height;    
  }
  trackMouse(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
    this.render();
    //~ this.init();
  }
  initBuffers() {
    this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
    this.texcoordLocation = this.gl.getAttribLocation(this.program, "a_texCoord");
    //~ this.timeLoc = this.gl.getUniformLocation(this.program, "u_time");
    //~ this.mouseCoordLocation = this.gl.getUniformLocation(this.program, "u_mouseCoord");
    this.matrixLocation = this.gl.getUniformLocation(this.program, "u_matrix");
    this.perspectiveLocation = this.gl.getUniformLocation(this.program, "perspectiveMatrix");
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
  createTexFromImage(img) {
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
      img.setAttribute("style","visibility: hidden;");
      return textureInfo;
    }
    if (img.complete) {
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
   
    // Set the matrices.
    this.gl.uniformMatrix4fv(this.matrixLocation, false, matrix);
    
    let mouse = {
      x0: ((this.width/2 - this.mouse.x) > 0) ? (this.mouse.x / (this.width/2))*-1 : -1,
      x1: ((this.width/2 - this.mouse.x) < 0) ? 1-((this.mouse.x / (this.width/2))-1) : 1,
      y0: ((this.height/2 - this.mouse.y) > 0) ? (this.mouse.y / (this.height/2))*-1 : -1,
      y1: ((this.height/2 - this.mouse.y) < 0) ? 1-((this.mouse.y / (this.height/2))-1) : 1,
    };
    let pmatrix = m4.orthographic(mouse.x0, mouse.x1, mouse.y0, mouse.y1, -1, 1);
    this.gl.uniformMatrix4fv(this.perspectiveLocation, false, pmatrix);

    //~ let pmatrix = m4.perspective(2, this.width / this.height, -1, 1000);
    //~ console.log(pmatrix);
    //~ let pmatrix = new Float32Array(
      //~ [0, 0, 0, 0,
       //~ 0, 0, 0, 0,
       //~ 0, 0, 0, 0,
       //~ 0, 0, 0, 0]);
   
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
let vertex = `precision mediump float;
attribute vec4 a_position;
attribute vec2 a_texCoord;

//~ uniform vec2 u_mouseCoord;
//~ uniform float u_time; 
uniform mat4 u_matrix;
uniform mat4 perspectiveMatrix;
 
varying vec2 v_texCoord;

//~ precision mediump float;
//~ attribute vec2 position;
//~ uniform mat4 transformMatrix;
//~ uniform mat4 perspectiveMatrix;
//~ varying vec2 texcoords;


void main() {
  //~ float oscillation = 0.0;
  //~ float amplitude = 0.2;
  //~ float frequence = 4.0;
  //~ float angle = (u_time + a_position.x) * frequence;

  //~ oscillation +=  sin(angle) * amplitude;
  //~ oscillation +=  1.0 + u_time;

    //~ gl_Position = perspectiveMatrix * u_matrix * vec4(a_position, oscillation, 1.0);
   gl_Position = u_matrix * a_position * perspectiveMatrix;
   //~ gl_Position = u_matrix * vec4(a_position.x, a_position.y, oscillation, 1.0) * perspectiveMatrix;
   //~ gl_Position = u_matrix * vec4(a_position.x, a_position.y, 1.0, oscillation);
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

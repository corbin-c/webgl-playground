class Gl {
  constructor(parameters) {
    if ((!parameters.vertex) || (!parameters.fragment)) {
      throw new Error("vertex & fragment parameters are mandatory");
    }
    if (parameters.canvas) {
      this.c = parameters.canvas;
    } else {
      this.c = document.createElement("canvas");
      document.body.append(this.c);
    }
    window.addEventListener("resize",() => {
      this.resize();
      this.render();
    });
    this.programReady = new Promise((resolve) => {
      this.programResolve = resolve;
    });
    this.vertices = this.generateVertices(100);
    this.v_count = this.vertices.length * 0.5;
    this.gl = this.c.getContext("webgl") || this.c.getContext("experimental-webgl");
    this.createProgram(parameters.vertex,parameters.fragment);
    this.c.addEventListener("mousemove",(event) => { this.trackMouse(event) });
    this.init();
  }
  async init() {
    await this.programReady;
    this.initBuffers();
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    let imgs = [...document.querySelectorAll("img")];
    this.textures = [];
    imgs.forEach(image => {
      this.textures.push(this.createTexFromImage(image));
    });
    this.resize();
    this.mouse = { x: this.width/2, y: this.height/2 };
    this.render();
  }
  render(time=0) {
    Promise.all(this.textures).then(textures => {
      textures.forEach((tex,i) => {
        tex.position = tex.img.getBoundingClientRect();
        this.drawImage(tex.texture,
          tex.position.width,
          tex.position.height,
          tex.position.left,
          tex.position.top,
          (i == 0) ? 0 : time+i*1500);
      });
    });
    requestAnimationFrame((t) => { this.render(t) });
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
    //~ this.render();
  }
  initBuffers() {
    this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
    this.texcoordLocation = this.gl.getAttribLocation(this.program, "a_texCoord");
    this.matrixLocation = this.gl.getUniformLocation(this.program, "u_matrix");
    this.mouseLoc = this.gl.getUniformLocation(this.program, "u_mouse");
    this.perspectiveLocation = this.gl.getUniformLocation(this.program, "perspectiveMatrix");
    this.textureLocation = this.gl.getUniformLocation(this.program, "u_texture");
    this.timeLocation = this.gl.getUniformLocation(this.program, "u_time");

    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

    //~ let positions = [
      //~ 0, 0,
      //~ 0, 1,
      //~ 1, 0,
      //~ 1, 0,
      //~ 0, 1,
      //~ 1, 1,
    //~ ];

    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.vertices), this.gl.STATIC_DRAW);
    //~ this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    this.texcoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texcoordBuffer);

    //~ this.texcoords = [
      //~ 0, 0,
      //~ 0, 1,
      //~ 1, 0,
      //~ 1, 0,
      //~ 0, 1,
      //~ 1, 1,
    //~ ];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.vertices), this.gl.STATIC_DRAW);
  }
  async createProgram(vertexShader, fragmentShader) {
    try {
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
    this.programResolve();
    } catch {
      console.info("fallback to external shaders");
      vertexShader = await fetch(vertexShader);
      vertexShader = await vertexShader.text();
      fragmentShader = await fetch(fragmentShader);
      fragmentShader = await fragmentShader.text();
      this.createProgram(vertexShader, fragmentShader);
    }
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
   
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
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
  drawImage(tex, texWidth, texHeight, dstX, dstY,time) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    this.gl.useProgram(this.program);
   
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texcoordBuffer);
    this.gl.enableVertexAttribArray(this.texcoordLocation);
    this.gl.vertexAttribPointer(this.texcoordLocation, 2, this.gl.FLOAT, false, 0, 0);
   
    let matrix = m4.orthographic(0, this.width, this.height, 0, -1, 1);

    matrix = m4.translate(matrix, dstX + texWidth/2, dstY + texHeight/2, 0);

    matrix = m4.scale(matrix, texWidth/2, texHeight/2, 1);
    //~ matrix = m4.zRotate(matrix, Math.PI/2);
   
    this.gl.uniformMatrix4fv(this.matrixLocation, false, matrix);
    this.gl.uniform1f(this.timeLocation, time * 0.001);
    this.gl.uniform2f(this.mouseLoc, this.mouse.x/this.width, this.mouse.y/this.height);

    let mouse = {
      x0: ((this.width/2 - this.mouse.x) > 0) ? (this.mouse.x / (this.width/2))*-1 : -1,
      x1: ((this.width/2 - this.mouse.x) < 0) ? 1-((this.mouse.x / (this.width/2))-1) : 1,
      y0: ((this.height/2 - this.mouse.y) > 0) ? (this.mouse.y / (this.height/2))*-1 : -1,
      y1: ((this.height/2 - this.mouse.y) < 0) ? 1-((this.mouse.y / (this.height/2))-1) : 1,
    };
    let pmatrix = m4.perspective(1, this.width/this.height, 1, 1000);
    //~ let pmatrix = m4.orthographic(mouse.x0, mouse.x1, mouse.y0, mouse.y1, -1, 1);
    //~ let pmatrix = m4.orthographic(0, this.width, this.height, 0, -1, 1);
    this.gl.uniformMatrix4fv(this.perspectiveLocation, false, pmatrix);
    this.gl.uniform1i(this.textureLocation, 0);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.v_count);
  }
  generateVertices(indicesNum) {
    let vertices = [];
    const limit = Math.ceil(indicesNum/4)-4;
    for(let i = limit; i > 0; i--) {
      let j = -1 * i/limit;
      vertices.push(j);
      vertices.push(1.0);
      vertices.push(j);
      vertices.push(-1.0);
    }
    vertices.push(0.0);
    vertices.push(1.0);
    vertices.push(0.0);
    vertices.push(-1.0);
    for(let k = 1; k <= limit; k++) {
      let l = k/limit;
      vertices.push(l);
      vertices.push(1.0);
      vertices.push(l);
      vertices.push(-1.0);
    }
    return vertices;
  }
}
let g = new Gl({ fragment: "./fragment.glsl", vertex: "./vertex.glsl" });

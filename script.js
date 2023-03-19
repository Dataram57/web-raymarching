//libs
//from https://web.dev/pointerlock-intro/
var havePointerLock = 'pointerLockElement' in document ||
    'mozPointerLockElement' in document ||
    'webkitPointerLockElement' in document;

const RequestPointerLockOnElementSetup = (element) => { 
    element.requestPointerLock = element.requestPointerLock ||
    element.mozRequestPointerLock ||
    element.webkitRequestPointerLock;
}

// Ask the browser to release the pointer
document.exitPointerLock = document.exitPointerLock ||
  document.mozExitPointerLock ||
  document.webkitExitPointerLock;
//document.exitPointerLock();

//vars
let camera_position = [1.5, 0.5, 1.5];
let camera_forward = [0, 0, 0];
let camera_left = [0, 0, 0];
let camera_rotation = [0, 0, 0];
let camera_sensitivity = 0.5;

(function loadscene() {    

    var canvas, gl, vp_size, prog, bufObj = {}, mousepos = [0, 0];
    
    function initScene() {
    
        canvas = document.getElementById( "ogl-canvas");
        gl = canvas.getContext( "experimental-webgl" );
        ff = gl;
        if ( !gl)
          return;
    
        canvas.addEventListener('mousemove', (e) => {
            camera_rotation[0] += (mousepos[0] - e.clientX) * camera_sensitivity;
            camera_rotation[1] += (mousepos[1] - e.clientY) * camera_sensitivity; 
            CorrectAngle(camera_rotation);
            mousepos = [e.clientX, e.clientY];
        });
    
        //onclick on canvast
        /*
        RequestPointerLockOnElementSetup(canvas);
        canvas.addEventListener("click", async () => {
            try{
                await canvas.requestPointerLock();
                console.log(3);
            }
            catch (e){}
        });
        */

        progDraw = gl.createProgram();
        for (let i = 0; i < 2; ++i) {
            let source = document.getElementById(i==0 ? "draw-shader-vs" : "draw-shader-fs").text;
            let shaderObj = gl.createShader(i==0 ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
            gl.shaderSource(shaderObj, source);
            gl.compileShader(shaderObj);
            let status = gl.getShaderParameter(shaderObj, gl.COMPILE_STATUS);
            if (!status) alert(gl.getShaderInfoLog(shaderObj));
            gl.attachShader(progDraw, shaderObj);
            gl.linkProgram(progDraw);
        }
        status = gl.getProgramParameter(progDraw, gl.LINK_STATUS);
        if ( !status ) alert(gl.getProgramInfoLog(progDraw));
        progDraw.inPos = gl.getAttribLocation(progDraw, "inPos");
        //set space for the uniform data
        progDraw.iCamPos = gl.getUniformLocation(progDraw, "iCamPos");
        progDraw.iCamRot = gl.getUniformLocation(progDraw, "iCamRot");
        progDraw.iTime = gl.getUniformLocation(progDraw, "iTime");
        progDraw.iMouse = gl.getUniformLocation(progDraw, "iMouse");
        progDraw.iResolution = gl.getUniformLocation(progDraw, "iResolution");
        //apply program to be used
        gl.useProgram(progDraw);
    
        var pos = [ -1, -1, 1, -1, 1, 1, -1, 1 ];
        var inx = [ 0, 1, 2, 0, 2, 3 ];
        bufObj.pos = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, bufObj.pos );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( pos ), gl.STATIC_DRAW );
        bufObj.inx = gl.createBuffer();
        bufObj.inx.len = inx.length;
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, bufObj.inx );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array( inx ), gl.STATIC_DRAW );
        gl.enableVertexAttribArray( progDraw.inPos );
        gl.vertexAttribPointer( progDraw.inPos, 2, gl.FLOAT, false, 0, 0 ); 
        
        gl.enable( gl.DEPTH_TEST );
        gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    
        window.onresize = resize;
        resize();
        requestAnimationFrame(render);
    }
    
    //on resize event
    function resize() {
        //vp_size = [gl.drawingBufferWidth, gl.drawingBufferHeight];
        vp_size = [window.innerWidth, window.innerHeight];
        //vp_size = [256, 256]
        canvas.width = vp_size[0];
        canvas.height = vp_size[1];
    }
    
    function render(deltaMS) {
    
        gl.viewport( 0, 0, canvas.width, canvas.height );
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
       
        //transport uniforms
        gl.uniform3f(progDraw.iCamPos, camera_position[0], camera_position[1], camera_position[2]);
        gl.uniform3f(progDraw.iCamRot, camera_rotation[0] * deg2rad, camera_rotation[1] * deg2rad, camera_rotation[2] * deg2rad);
        gl.uniform1f(progDraw.iTime, deltaMS/1000.0);
        gl.uniform2f(progDraw.iResolution, canvas.width, canvas.height);
        gl.uniform2f(progDraw.iMouse, mousepos[0], mousepos[1]);

        //render
        gl.drawElements( gl.TRIANGLES, bufObj.inx.len, gl.UNSIGNED_SHORT, 0 );
        
        requestAnimationFrame(render);
    }  
    
    initScene();
    
    })();

//pitch and yaw are in radians
const GetFPSForward = (pitch, yaw) => {
    return [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)];
}

const SeparateVec3 = (arr) =>{
    return [arr[0], arr[1], arr[2]];
}
const ModuloVec3 = (v, a) =>{
    v[0] %= a;
    v[1] %= a;
    v[2] %= a;
    return v;
}
const CorrectAngle = (v) =>{
    return ModuloVec3(v, 360);
}
const ScaleVec3 = (arr, multi) =>{
    arr[0] *= multi;
    arr[1] *= multi;
    arr[2] *= multi;
    return arr;
}
const TranslateVec3 = (main, add) =>{
    main[0] += add[0];
    main[1] += add[1];
    main[2] += add[2];
    return main;
}
const SubTranslateVec3 = (main, add) =>{
    main[0] -= add[0];
    main[1] -= add[1];
    main[2] -= add[2];
    return main;
}
const IsVec3Zero = (v) =>{
    if(v[0] != 0) return false;
    if(v[1] != 0) return false;
    if(v[2] != 0) return false;
    return true;
}

let speed = 0.1;
let rotateSpeed = 2;
setInterval(()=>{
    //recalculate camera's stuff
    let temp = SeparateVec3(camera_rotation);
    ScaleVec3(temp, deg2rad);
    camera_forward = GetFPSForward(temp[1], temp[0]);
    temp[0] += Math.PI * 0.5;
    camera_left = [Math.cos(temp[0]), 0, Math.sin(temp[0])];

    //movement
    temp = [0, 0, 0];
    if(isKeyPressed('KeyW')){
        TranslateVec3(temp, camera_forward);
    }
    if(isKeyPressed('KeyS')){
        SubTranslateVec3(temp, camera_forward)
    }
    if(isKeyPressed('KeyA')){
        TranslateVec3(temp, camera_left)
    }
    if(isKeyPressed('KeyD')){
        SubTranslateVec3(temp, camera_left)
    }
    if(isKeyPressed('KeyE')){
        temp[1] += 1;
    }
    if(isKeyPressed('KeyQ')){
        temp[1] -= 1;
    }
    //move
    if(!IsVec3Zero(temp)){
        ScaleVec3(temp, speed);
        TranslateVec3(camera_position, temp);
    }



    //y = (y + 0.02) % 12;
    //z = (z + 0.02) % 12;
    /*
    if(isKeyPressed('KeyA')) rotx += rotateSpeed;
    if(isKeyPressed('KeyD')) rotx -= rotateSpeed;
    if(isKeyPressed('KeyE')) roty += rotateSpeed;
    if(isKeyPressed('KeyQ')) roty -= rotateSpeed;
    */
},10);

let pressedKeys = [];
const isKeyPressed = (code) => {
    let i = pressedKeys.length;
    while(--i > -1)
        if(pressedKeys[i] == code)
            return true;
    return false;
}
addEventListener("keyup", (event) => {
    let i = pressedKeys.length;
    while(--i > -1 && pressedKeys[i] == null)
        pressedKeys.pop();
    i++;
    while(--i > -1)
        if(pressedKeys[i] == event.code){
            pressedKeys[i] = null;
            return;
        }
});
addEventListener("keydown", (event) => {
    let i;
    for(i = 0; i < pressedKeys.length; i++)
        if(pressedKeys[i] == event.code)
            return;
    for(i = 0; i < pressedKeys.length; i++)
        if(pressedKeys[i] == null){
            pressedKeys[i] = event.code;
            return;
        }
    pressedKeys.push(event.code);
});
const deg2rad = Math.PI / 180;
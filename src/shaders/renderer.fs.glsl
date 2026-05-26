precision mediump float;
#define PI 3.1415926538
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 iCamPos;
uniform vec3 iCamRot;

const int kRaySteps = 100;
const vec3 kAmbient = vec3(0.2, 0.2, 0.2);


//================================================================
//#region Math


//#endregion

//================================================================
//#region SDF Operations

// Union
float opU(float d1, float d2) {
    return min(d1, d2);
}

// Subtraction (d1 - d2)
float opS(float d1, float d2) {
    return max(-d2, d1);
}

// Intersection
float opI(float d1, float d2) {
    return max(d1, d2);
}

// #endregion

//================================================================
//#region SDF Functions

float sdSphere(vec3 p, float s ){
    return length(p)-s;
}

float sdBox(vec3 p, vec3 b ){
    vec3 d = abs(p) - b;
    return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

float sdPlane(vec3 p){
    return p.y;
}

float sdTriPrism( vec3 p, vec2 h ){
    vec3 q = abs(p);
    return max(q.z-h.y,max(q.x*0.866025+p.y*0.5,-p.y)-h.x*0.5);
}

float opTwist( vec3 p ){
    float c = cos(5.*p.y);
    float s = sin(5.*p.y);
    mat2  m = mat2(c,-s,s,c);
    vec3  q = vec3(m*p.xz,p.y);
    return sdBox(q, vec3(.25));
}

//#endregion

//================================================================
//#region Scene

// Distance to closest scene hit
float map(vec3 pos){
    float dist;
    //dist = sdPlane(pos + vec3(0,32,0));
    //dist = opU(dist, sdSphere(pos + vec3(3, -1, 3), 0.25));
    dist = sdBox(pos + vec3(0,2.5,0),vec3(5.5,0.5,5.5));
    //4 columns
    dist = opU(dist, sdBox(pos + vec3(5, 0, 5), vec3(0.5, 2, 0.5)));
    dist = opU(dist, sdBox(pos + vec3(5,0,-5), vec3(0.5, 2, 0.5)));
    dist = opU(dist, sdBox(pos + vec3(-5,0,-5), vec3(0.5 ,2, 0.5)));
    dist = opU(dist, sdBox(pos + vec3(-5,0,5), vec3(0.5, 2, 0.5)));
    //
    //dist = opU(dist, sdBox(pos + vec3(0,2.5,0),vec3(5.5, 0.5, 5.5)));
    //dist = opU(dist, sdTriPrism(pos + vec3(-3, -3, -3), vec2(0.25)));
    dist = opS(dist, sdSphere(pos + vec3(0,3,0),  4.0));
    //
    //dist = opS(dist,sdBox(pos + vec3(0,2.5,0),vec3(5.5,0.5,5.5)));
    
    //sphere
    //dist = opU(dist, sdTriPrism(pos + vec3(3, 3, 3), vec2(0.25)));
    //dist = opU(dist, sdTriPrism(pos + vec3(-3, -3, -3), vec2(0.25)));
    return dist;
}

//#endregion

//================================================================
//#region Lighting

vec3 getNormal(vec3 pos){
    float epsilon = 0.001;
    vec2 t = vec2(0.0, epsilon);
    return normalize(
        vec3(map(pos + t.yxx) - map(pos - t.yxx),
        map(pos + t.xyx) - map(pos - t.xyx),
        map(pos + t.xxy) - map(pos - t.xxy))
    );
}

float softshadow( in vec3 ro, in vec3 rd, in float mint, in float tmax ){
    float res = 1.0;
    float t = mint;
    for( int i=0; i<kRaySteps; i++ ){
        float h = map(ro + rd*t);{
            if( h<0.001 )
                return 0.0;
            res = min( res, 48.*h/t );
        }
        t += h;
        if(t>tmax)
            break;
    }
    return clamp(res, 0.0, 1.0);
}

// Uses map function (smallest distance to scene) for
// approximating normal at pos
vec3 lighting(vec3 pos, vec3 lightDir){
    vec3 n =getNormal(pos);
    return vec3(1.0) * max(0.,dot(n, lightDir)) * softshadow(pos, lightDir,0.02, 50.) + kAmbient;
}

float repeat(float t, float min, float max) {
    float diff = max - min;
    float d = t / diff;
    return fract(d) * diff + min;
}

//#endregion

//================================================================
//#region Raymarcher

vec3 getColor(vec3 rayPos, vec3 rayDir) {
    vec3 color;
    vec3 bg = vec3(0.5, 0.6, 1.);
    
    color = bg;
    for (int i = 0; i < kRaySteps; ++i){
        float d = map(rayPos);
        rayPos += d * rayDir;
        if (d < 0.001){
            color = lighting(rayPos, normalize(vec3(sin(iTime / 2.) + 0.1, 0.1, 0.2)));
            break;
        }
    }
    
    return color;
}

vec3 FPSCord(float pitch, float yaw){
    return vec3(cos(pitch) * cos(yaw), sin(pitch), cos(pitch) * sin(yaw));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec2 uv = fragCoord.xy / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;
    
    // Make uv go [-0.5, 0.5] and scale uv.x according to aspect ratio
    uv -= .5;
    uv.x = aspect * uv.x;
    // Initialize camera stuff
    vec3 camPos = iCamPos;
    //rotate camera
    //flat tank = vec3(cos(iCamRot.x), 0, sin(iCamRot.x));
    //Cam type: FPS
    //vec3(cos(pitch) * cos(yaw), sin(pitch), cos(pitch) * sin(yaw))
    //vec3(-sin(pitch) * cos(yaw), cos(pitch), -sin(pitch) * sin(yaw))
    vec3 camDir = FPSCord(iCamRot.y, iCamRot.x);
    vec3 camUp = FPSCord(iCamRot.y + PI * 0.5, iCamRot.x);
    //rest
    vec3 camRight = normalize(cross(camUp, camDir));
    camUp = normalize(cross(camDir, camRight));
    
    //get raymarching parameters per single pixel
    vec3 rayPos = camPos;
    vec3 rayDir = normalize(camDir + uv.x * camRight + uv.y * camUp);
    
    // Raymarch scene to get pixel color
    vec3 color = getColor(rayPos, rayDir);
    
    // Set pixel color
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage( gl_FragColor, gl_FragCoord.xy );
}

//#endregion
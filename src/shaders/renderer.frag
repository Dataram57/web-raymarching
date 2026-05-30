precision mediump float;

#include "./shapes.glsl"


#define PI 3.14159265359

uniform vec2 iResolution;
uniform float iTime;

uniform vec3 iCamPos;
uniform vec3 iCamRot;

// ================================================================
// SETTINGS

const int   MAX_STEPS          = 128;
const float MAX_DIST           = 100.0;
const float SURFACE_DIST       = 0.001;

const float VOLUME_STEP_SIZE   = 0.08;

const vec3 AMBIENT             = vec3(0.15);

// ================================================================
// OPERATIONS

float opU(float d1, float d2)
{
    return min(d1, d2);
}

float opS(float d1, float d2)
{
    return max(-d2, d1);
}

float opI(float d1, float d2)
{
    return max(d1, d2);
}

// ================================================================
// SDFS



// ================================================================
// SCENE

#include "./scene.glsl"

// ================================================================
// FOG DENSITY

float fogDensity(vec3 p)
{
    // main fog sphere
    float sphere =
        sdSphere(
            p - vec3(0.0, 1.5, 0.0),
            4.5
        );

    // soft volume
    float density =
        smoothstep(0.0, -2.0, sphere);

    // animated noise
    float noise =
        sin(p.x * 3.0 + iTime)
        * sin(p.y * 4.0)
        * sin(p.z * 3.0);

    density *= 0.6 + 0.4 * noise;

    // height fade
    density *= exp(-p.y * 0.15);

    return max(density, 0.0);
}

// ================================================================
// NORMALS

vec3 getNormal(vec3 p)
{
    float e = 0.001;

    vec2 h = vec2(e, 0.0);

    return normalize(vec3(
        scene(p + h.xyy) - scene(p - h.xyy),
        scene(p + h.yxy) - scene(p - h.yxy),
        scene(p + h.yyx) - scene(p - h.yyx)
    ));
}

// ================================================================
// SHADOWS

float softshadow(
    vec3 ro,
    vec3 rd,
    float mint,
    float maxt
){
    float res = 1.0;

    float t = mint;

    for(int i = 0; i < 64; i++)
    {
        float h = scene(ro + rd * t);

        if(h < 0.001)
            return 0.0;

        res = min(res, 32.0 * h / t);

        t += h;

        if(t > maxt)
            break;
    }

    return clamp(res, 0.0, 1.0);
}

// ================================================================
// LIGHTING

vec3 lighting(
    vec3 p,
    vec3 rd,
    vec3 lightDir
){
    vec3 n = getNormal(p);

    float diff =
        max(dot(n, lightDir), 0.0);

    float shadow =
        softshadow(
            p + n * 0.01,
            lightDir,
            0.02,
            30.0
        );

    vec3 diffuse =
        vec3(1.0) * diff * shadow;

    // specular
    vec3 h =
        normalize(lightDir - rd);

    float spec =
        pow(max(dot(n, h), 0.0), 64.0);

    return diffuse + spec + AMBIENT;
}

// ================================================================
// CAMERA

vec3 FPSCamera(float pitch, float yaw)
{
    return vec3(
        cos(pitch) * cos(yaw),
        sin(pitch),
        cos(pitch) * sin(yaw)
    );
}

// ================================================================
// RENDERER

vec3 render(vec3 ro, vec3 rd)
{
    vec3 bg =
        vec3(0.5, 0.7, 1.0);

    vec3 color = vec3(0.0);

    float transmittance = 1.0;

    float t = 0.0;

    vec3 lightDir =
        normalize(vec3(
            sin(iTime * 0.5),
            0.8,
            0.3
        ));

    for(int i = 0; i < MAX_STEPS; i++)
    {
        vec3 p = ro + rd * t;

        float d = scene(p);

        // ========================================================
        // VOLUMETRIC FOG

        float density =
            fogDensity(p);

        if(density > 0.001)
        {
            vec3 fogColor =
                vec3(0.7, 0.8, 1.0);

            // light scattering
            float light =
                softshadow(
                    p,
                    lightDir,
                    0.1,
                    15.0
                );

            float absorption =
                density * VOLUME_STEP_SIZE;

            vec3 scatter =
                fogColor * light;

            color +=
                scatter
                * absorption
                * transmittance;

            // Beer-Lambert
            transmittance *=
                exp(-absorption);
        }

        // ========================================================
        // SURFACE HIT

        if(d < SURFACE_DIST)
        {
            vec3 surfaceColor =
                lighting(
                    p,
                    rd,
                    lightDir
                );

            color +=
                surfaceColor
                * transmittance;

            break;
        }

        // ========================================================
        // ADVANCE

        float stepSize =
            clamp(d, 0.02, 0.2);

        t += stepSize;

        if(t > MAX_DIST)
            break;

        // fully opaque fog
        if(transmittance < 0.01)
            break;
    }

    // background contribution
    color += bg * transmittance;

    return color;
}

// ================================================================
// MAIN

void mainImage(
    out vec4 fragColor,
    in vec2 fragCoord
){
    vec2 uv =
        fragCoord.xy / iResolution.xy;

    uv -= 0.5;

    uv.x *=
        iResolution.x / iResolution.y;

    // ============================================================
    // CAMERA

    vec3 camPos = iCamPos;

    vec3 camDir =
        FPSCamera(
            iCamRot.y,
            iCamRot.x
        );

    vec3 camUp =
        FPSCamera(
            iCamRot.y + PI * 0.5,
            iCamRot.x
        );

    vec3 camRight =
        normalize(cross(camUp, camDir));

    camUp =
        normalize(cross(camDir, camRight));

    // ============================================================
    // RAY

    vec3 rayOrigin = camPos;

    vec3 rayDir =
        normalize(
            camDir
            + uv.x * camRight
            + uv.y * camUp
        );

    // ============================================================
    // RENDER

    vec3 color =
        render(rayOrigin, rayDir);

    fragColor =
        vec4(color, 1.0);
}

void main()
{
    mainImage(
        gl_FragColor,
        gl_FragCoord.xy
    );
}
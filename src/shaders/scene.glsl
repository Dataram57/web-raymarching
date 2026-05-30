float scene(vec3 p){
    float d;

    // roof
    d = sdBox(
        p + vec3(0.0, 2.5, 0.0),
        vec3(5.5, 0.5, 5.5)
    );

    // columns
    d = opU(d,
        sdBox(
            p + vec3(5.0, 0.0, 5.0),
            vec3(0.5, 2.0, 0.5)
        )
    );

    d = opU(d,
        sdBox(
            p + vec3(5.0, 0.0, -5.0),
            vec3(0.5, 2.0, 0.5)
        )
    );

    d = opU(d,
        sdBox(
            p + vec3(-5.0, 0.0, -5.0),
            vec3(0.5, 2.0, 0.5)
        )
    );

    d = opU(d,
        sdBox(
            p + vec3(-5.0, 0.0, 5.0),
            vec3(0.5, 2.0, 0.5)
        )
    );

    // subtract sphere
    d = opS(
        d,
        sdSphere(
            p + vec3(0.0, 3.0, 0.0),
            4.0
        )
    );

    return d;
}
#define PARTICLE_LIFE_SPEED 2.0

#define HUGE 9E16
#define PI 3.14159265
#define V vec3(0.,1.,-1.)
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

// ------

precision highp float;

varying vec3 vPos;
varying float vLife;
varying float vMode;
varying float vLen;

uniform bool depth;

uniform float time;
uniform float frames;
uniform vec2 resolution;
uniform vec3 cameraPos;
uniform vec3 lightPos;

// ------

vec3 catColor( float _p ) {
  return 0.5 + 0.5 * vec3(
    cos( _p ),
    cos( _p + PI / 3.0 * 2.0 ),
    cos( _p + PI / 3.0 * 4.0 )
  );
}

mat2 rotate2D( float _t ) {
  return mat2( cos( _t ), sin( _t ), -sin( _t ), cos( _t ) );
}

void main() {
  vec3 color = exp( -5.0 * ( 1.0 - vLife ) ) * ( 0.1 + 0.9 * catColor( 1.0 + vLife * 3.0 ) );
  color *= 1.0 + 9.0 * exp( -50.0 * ( 1.0 - vLife ) );
  float decay = exp( -0.6 * vLen );
  float shape = smoothstep( 0.5, 0.3, length( 0.5 - gl_PointCoord ) );

  gl_FragColor = vec4( color * 10.0, shape * decay );
}
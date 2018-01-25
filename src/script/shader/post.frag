#define HUGE 9E16
#define PI 3.14159265
#define V vec3(0.,1.,-1.)
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

// ------

precision highp float;

uniform float time;
uniform vec2 resolution;

uniform sampler2D textureBloom;
uniform sampler2D textureDry;

// ------

vec2 barrel( float _amp, vec2 _uv ) {
	vec2 uv = _uv;
	float corn = length( vec2( 0.5 ) );
	float amp = min( _amp * 3.0, PI * corn );
	float zoom = corn / ( tan( corn * amp ) + corn );
	return saturate( ( uv + normalize( uv - 0.5 ) * tan( length( uv - 0.5 ) * amp ) ) * zoom + 0.5 * ( 1.0 - zoom ) );
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float vig = 1.14 - length( uv - 0.5 ) * 0.8;

  vec3 tex = texture2D( textureDry, uv ).xyz;

  tex += texture2D( textureBloom, uv ).xyz;
  tex = mix(
    vec3( 0.0 ),
    tex,
    vig
  );

  vec3 col = tex.xyz;
  col = vec3(
    smoothstep( -0.04, 1.04, col.x ),
    smoothstep( 0.0, 1.0, col.y ),
    smoothstep( -0.1, 1.1, col.z )
  );
  gl_FragColor = vec4( pow( col, vec3( 1.0 / 2.2 ) ), 1.0 );
}
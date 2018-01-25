#extension GL_EXT_frag_depth : enable

#define TRACE_ITER 1
#define MARCH_MUL 0.8
#define MARCH_ITER 160
#define RAYLEN_INIT 0.01
#define INTERSECT_MIN 0.001
#define MARCH_FAR 100.0
#define FOV 90.0
#define DEPTH_NEAR 0.01
#define DEPTH_FAR 100.0

#define HUGE 9E16
#define PI 3.14159265
#define V vec3(0.,1.,-1.)
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

// ------

precision highp float;

uniform float time;
uniform vec2 resolution;
uniform vec3 cameraPos;
uniform float cameraRot;

uniform sampler2D textureRandomStatic;

// ------

vec3 catColor( float _p ) {
  return 0.5 + 0.5 * vec3(
    cos( _p ),
    cos( _p + PI / 3.0 * 2.0 ),
    cos( _p + PI / 3.0 * 4.0 )
  );
}

// ------

vec4 randomStatic( vec2 _uv ) {
  return texture2D( textureRandomStatic, _uv );
}

mat2 rotate2D( float _t ) {
  return mat2( cos( _t ), sin( _t ), -sin( _t ), cos( _t ) );
}

float smin( float a, float b, float k ) {
  float res = exp( -k * a ) + exp( -k * b );
  return -log( res ) / k;
}

// ------

struct Camera {
  vec3 pos;
  vec3 dir;
  vec3 sid;
  vec3 top;
  float fov;
};

// レイの構造体
struct Ray {
  vec3 dir;
  vec3 ori;
};

// ------

Camera camInit( in vec3 _pos, in vec3 _tar, in float _rot, in float _fov ) {
  Camera cam;
  cam.pos = _pos;
  cam.dir = normalize( _tar - _pos );
  cam.sid = normalize( cross( cam.dir, V.xyx ) );
  cam.top = normalize( cross( cam.sid, cam.dir ) );
  cam.sid = cos( _rot ) * cam.sid + sin( _rot ) * cam.top;
  cam.top = normalize( cross( cam.sid, cam.dir ) );
  cam.fov = _fov;

  return cam;
}

Ray rayInit( in vec3 _ori, in vec3 _dir ) {
  Ray ray;
  ray.dir = _dir;
  ray.ori = _ori;
  return ray;
}

Ray rayFromCam( in vec2 _p, in Camera _cam ) {
  vec3 dir = normalize(
    _p.x * _cam.sid
    + _p.y * _cam.top
    + _cam.dir / tan( _cam.fov * PI / 360.0 ) // Is this correct?
  );
  return rayInit( _cam.pos, dir );
}

// ------

float distBox( vec3 _p, vec3 _s ) {
  vec3 d = abs( _p ) - _s;
  return min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) );
}

vec3 typeIfs( vec3 _p, vec3 _rot, vec3 _shift ) {
  vec3 pos = _p;

  vec3 shift = _shift;

  for ( int i = 0; i < 5; i ++ ) {
    float intensity = pow( 2.0, -float( i ) );

    pos = abs( pos ) - shift * intensity;

    shift.yz = rotate2D( _rot.x ) * shift.yz;
    shift.zx = rotate2D( _rot.y ) * shift.zx;
    shift.xy = rotate2D( _rot.z ) * shift.xy;

    if ( pos.x < pos.y ) { pos.xy = pos.yx; }
    if ( pos.x < pos.z ) { pos.xz = pos.zx; }
    if ( pos.y < pos.z ) { pos.yz = pos.zy; }
  }

  return pos;
}

float distFunc( vec3 _p, out float mtl ) {
  float dist = 1E9;
  mtl = 0.0;

  {
    vec3 p = _p;
    p.z = mod( p.z - 2.5, 5.0 ) - 2.5;
    p = typeIfs( p, vec3( -0.01, 0.06, -0.01 ), vec3( 4.4, 6.8, 4.8 ) );
    dist = distBox( p, vec3( 0.27 ) );
  }

  {
    vec3 p = _p;
    p.z = mod( p.z - 1.0, 2.0 ) - 1.0;
    p = typeIfs( p, vec3( 0.02, -0.13, 0.01 ), vec3( 11.4, 4.8, 5.1 ) );
    dist = min( dist, distBox( p, vec3( 0.4 ) ) );
  }

  return dist;
}

float distFunc( vec3 _p ) {
  float dummy;
  return distFunc( _p, dummy );
}

vec3 normalFunc( in vec3 _p, in float _d ) {
  vec3 d = V * _d;
  return normalize( vec3(
    distFunc( _p + d.yxx ) - distFunc( _p - d.yxx ),
    distFunc( _p + d.xyx ) - distFunc( _p - d.xyx ),
    distFunc( _p + d.xxy ) - distFunc( _p - d.xxy )
  ) );
}

// ------

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = ( gl_FragCoord.xy * 2.0 - resolution ) / resolution.y;

  Camera cam = camInit( cameraPos, vec3( 0.0, 0.0, 0.0 ), cameraRot, FOV );
  Ray ray = rayFromCam( p, cam );

  float rayLen = RAYLEN_INIT;
  vec3 rayPos = ray.ori + ray.dir * rayLen;

  vec3 color = vec3( 0.0 );
  vec3 rayCol = vec3( 1.0 );
  float mtl;

  for ( int iTrace = 0; iTrace < TRACE_ITER; iTrace ++ ) {
    float dist;
    for ( int iMarch = 0; iMarch < MARCH_ITER; iMarch ++ ) {
      dist = distFunc( rayPos, mtl );
      rayLen += dist * MARCH_MUL;
      rayPos = ray.ori + ray.dir * rayLen;

      if ( dist < INTERSECT_MIN ) { break; }
      if ( MARCH_FAR < dist ) { break; }
    }

    rayCol *= exp( -0.4 * rayLen );

    if ( dist < INTERSECT_MIN ) {
      vec3 normal = normalFunc( rayPos, 1E-4 );

      if ( mtl == 0.0 ) {
        float edge = 0.2 * smoothstep(
          0.1,
          0.4,
          length( normal - normalFunc( rayPos, 5E-3 * rayLen ) )
        );
        edge += exp( -10.0 * abs( dot( normal, ray.dir ) ) );
        color = rayCol * mix(
          vec3( 0.1, 0.2, 0.4 ),
          vec3( 2.4, 7.8, 9.0 ) * 4.0,
          edge
        );
        rayCol = vec3( 0.0 );
      } else {
        color += rayCol * vec3( 5.0 );
      }

      if ( iTrace == 0 ) {
        float d = DEPTH_FAR / ( DEPTH_FAR - DEPTH_NEAR );
        gl_FragDepthEXT = ( rayLen - DEPTH_NEAR ) * d / rayLen;
      }

      ray = rayInit( rayPos, reflect( ray.dir, normal ) );
    } else {
      rayCol = vec3( 0.0 );

      if ( iTrace == 0 ) {
        gl_FragDepthEXT = 1.0;
      }
      break;
    }

    if ( length( rayCol ) < 0.0001 ) { break; }
  }

  gl_FragColor = vec4( color, 1.0 );
}
// mirrorFloor.js - A polished stone floor that reflects what stands on it: the glowing doorways, the
// light strips, the installation in the middle, softly, as dark stone does.
//
// The floor is an ordinary lit stone material (lights, shadows and fog still work on it); on top,
// it adds a planar reflection: once per frame, just before the floor is drawn, the scene is drawn
// again from below the floor (mirrored camera, at a fraction of the screen's resolution) and the
// floor samples that picture, a little blurred, more at grazing angles. The mirroring follows
// three.js's Reflector (examples/jsm/objects/Reflector.js, MIT licence).
//
// It costs one extra render of the scene while the floor is in view, so it is for small, bright
// spaces like the museum's halls; `reflect: false` (e.g. in low quality) leaves the plain stone.
import * as THREE from 'three';

const BIAS = new THREE.Matrix4().set(
    0.5, 0, 0, 0.5,
    0, 0.5, 0, 0.5,
    0, 0, 0.5, 0.5,
    0, 0, 0, 1
);

// Large dark tiles with fine seams and a faint grain, drawn once
function createTileTexture({ base = '#0b0e14', seam = '#1c2433', tiles = 4, size = 512 }) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);
    // Grain: soft, uneven clouds of slightly lighter stone
    for (let i = 0; i < 900; i++) {
        const x = Math.random() * size, y = Math.random() * size, r = 2 + Math.random() * 18;
        context.fillStyle = `rgba(160, 180, 210, ${Math.random() * 0.018})`;
        context.beginPath();
        context.arc(x, y, r, 0, Math.PI * 2);
        context.fill();
    }
    context.strokeStyle = seam;
    context.lineWidth = 2;
    const step = size / tiles;
    for (let i = 0; i <= tiles; i++) {
        context.beginPath();
        context.moveTo(i * step, 0);
        context.lineTo(i * step, size);
        context.moveTo(0, i * step);
        context.lineTo(size, i * step);
        context.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
}

// width, depth: metres; tileSize: metres per tile; reflect: whether it mirrors at all; strength: how
// much it reflects (0..1); blur: how soft the reflection is; resolution: share of the screen's size
// renderer: the WebGLRenderer (its size sets the reflection's)
export function createMirrorFloor({
    width, depth, tileSize = 2, reflect = true, strength = 0.55, blur = 1, resolution = 0.5,
    colors = {}, roughness = 0.38, renderer
}) {
    const tiles = 4;
    const map = createTileTexture({ ...colors, tiles });
    map.repeat.set(width / (tileSize * tiles), depth / (tileSize * tiles));

    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map,
        roughness,
        metalness: 0.1,
        envMapIntensity: 0.35
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    mesh.rotation.x = -Math.PI / 2; // Its own +z (the plane's normal) points up
    mesh.receiveShadow = true;
    if (!reflect || !renderer) return mesh;

    const size = renderer.getDrawingBufferSize(new THREE.Vector2()).multiplyScalar(resolution).floor();
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 2 });
    const textureMatrix = new THREE.Matrix4();
    const uniforms = {
        mirrorMap: { value: target.texture },
        mirrorMatrix: { value: textureMatrix },
        mirrorStrength: { value: strength },
        mirrorSpread: { value: new THREE.Vector2(blur / size.x, blur / size.y) }
    };

    material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                uniform mat4 mirrorMatrix;
                varying vec4 vMirrorCoord;`)
            .replace('#include <project_vertex>', `#include <project_vertex>
                vMirrorCoord = mirrorMatrix * vec4(position, 1.0);`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                uniform sampler2D mirrorMap;
                uniform float mirrorStrength;
                uniform vec2 mirrorSpread;
                varying vec4 vMirrorCoord;`)
            .replace('#include <opaque_fragment>', `{
                vec2 mirrorUv = vMirrorCoord.xy / vMirrorCoord.w;
                // A soft cross of samples: polished stone, not a mirror
                vec2 spread = mirrorSpread * (2.0 + 6.0 * roughnessFactor);
                vec3 reflection = texture2D(mirrorMap, mirrorUv).rgb * 0.28;
                reflection += texture2D(mirrorMap, mirrorUv + vec2(spread.x, spread.y * 0.4)).rgb * 0.18;
                reflection += texture2D(mirrorMap, mirrorUv - vec2(spread.x, spread.y * 0.4)).rgb * 0.18;
                reflection += texture2D(mirrorMap, mirrorUv + vec2(-spread.x * 0.4, spread.y)).rgb * 0.18;
                reflection += texture2D(mirrorMap, mirrorUv + vec2(spread.x * 0.4, -spread.y)).rgb * 0.18;
                // More at grazing angles (Fresnel), less over the seams and the brighter grain
                float facing = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
                float fresnel = 0.12 + 0.88 * pow(1.0 - facing, 3.0);
                float seam = smoothstep(0.014, 0.026, diffuseColor.r + diffuseColor.g);
                outgoingLight += reflection * mirrorStrength * fresnel * (1.0 - 0.7 * seam);
            }
            #include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => 'mirror-floor';

    // Mirroring, as in three.js's Reflector
    const virtualCamera = new THREE.PerspectiveCamera();
    const plane = new THREE.Plane();
    const normal = new THREE.Vector3();
    const floorPosition = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    const rotation = new THREE.Matrix4();
    const lookAt = new THREE.Vector3();
    const view = new THREE.Vector3();
    const targetPoint = new THREE.Vector3();
    const clipPlane = new THREE.Vector4();
    const q = new THREE.Vector4();
    const drawingSize = new THREE.Vector2();

    mesh.onBeforeRender = (gl, scene, camera) => {
        // Follow the screen's size
        gl.getDrawingBufferSize(drawingSize).multiplyScalar(resolution).floor();
        if (drawingSize.x !== target.width || drawingSize.y !== target.height) {
            target.setSize(drawingSize.x, drawingSize.y);
            uniforms.mirrorSpread.value.set(blur / drawingSize.x, blur / drawingSize.y);
        }

        floorPosition.setFromMatrixPosition(mesh.matrixWorld);
        cameraPosition.setFromMatrixPosition(camera.matrixWorld);
        rotation.extractRotation(mesh.matrixWorld);
        normal.set(0, 0, 1).applyMatrix4(rotation);
        view.subVectors(floorPosition, cameraPosition);
        if (view.dot(normal) > 0) return; // Seen from below

        view.reflect(normal).negate().add(floorPosition);
        rotation.extractRotation(camera.matrixWorld);
        lookAt.set(0, 0, -1).applyMatrix4(rotation).add(cameraPosition);
        targetPoint.subVectors(floorPosition, lookAt).reflect(normal).negate().add(floorPosition);

        virtualCamera.position.copy(view);
        virtualCamera.up.set(0, 1, 0).applyMatrix4(rotation).reflect(normal);
        virtualCamera.lookAt(targetPoint);
        virtualCamera.far = camera.far;
        virtualCamera.updateMatrixWorld();
        virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

        textureMatrix.copy(BIAS).multiply(virtualCamera.projectionMatrix)
            .multiply(virtualCamera.matrixWorldInverse).multiply(mesh.matrixWorld);

        // Clip everything below the floor (oblique near plane, Lengyel)
        plane.setFromNormalAndCoplanarPoint(normal, floorPosition).applyMatrix4(virtualCamera.matrixWorldInverse);
        clipPlane.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
        const projection = virtualCamera.projectionMatrix;
        q.x = (Math.sign(clipPlane.x) + projection.elements[8]) / projection.elements[0];
        q.y = (Math.sign(clipPlane.y) + projection.elements[9]) / projection.elements[5];
        q.z = -1;
        q.w = (1 + projection.elements[10]) / projection.elements[14];
        clipPlane.multiplyScalar(2 / clipPlane.dot(q));
        projection.elements[2] = clipPlane.x;
        projection.elements[6] = clipPlane.y;
        projection.elements[10] = clipPlane.z + 1;
        projection.elements[14] = clipPlane.w;

        mesh.visible = false;
        const currentTarget = gl.getRenderTarget();
        const shadowAutoUpdate = gl.shadowMap.autoUpdate;
        gl.shadowMap.autoUpdate = false;
        gl.setRenderTarget(target);
        gl.state.buffers.depth.setMask(true);
        if (gl.autoClear === false) gl.clear();
        gl.render(scene, virtualCamera);
        gl.shadowMap.autoUpdate = shadowAutoUpdate;
        gl.setRenderTarget(currentTarget);
        const viewport = camera.viewport;
        if (viewport !== undefined) gl.state.viewport(viewport);
        mesh.visible = true;
    };

    mesh.dispose = () => target.dispose(); // Called when the world is freed (see disposeObject)
    return mesh;
}

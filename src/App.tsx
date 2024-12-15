import * as THREE from 'three'

import { ComponentProps, ElementRef, forwardRef, Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { folder, useControls } from 'leva'
import {
  FaceLandmarker,
  PerspectiveCamera,
  Helper,
  CameraControls,
  Center,
  Resize,
  Environment,
  Sphere,
} from '@react-three/drei'
import { suspend } from 'suspend-react'
import { VertexNormalsHelper } from 'three-stdlib'
import * as easing from 'maath/easing'

const city = import('@pmndrs/assets/hdri/city.exr')

import { FaceControls } from './tmp/FaceControls'
import { Raycaster } from './tmp/Raycaster'

import { Pasteque } from './Pasteque'
import { Suzi } from './Suzi'

window.THREE = THREE

export default function App() {
  return (
    <>
      <Canvas camera={{ position: [-1.5, 1, 2] }} shadows>
        <Scene />
      </Canvas>
    </>
  )
}

function Scene() {
  const gui = useControls({
    camera: { value: 'cc', options: ['user', 'cc'] },
    model: { value: 'ball', options: ['suzi', 'pasteque', 'ball'] },
    raycaster: { value: 'pointer', options: ['pointer', 'own'] },
    distance: { value: 1.5, min: 0, max: 10 },
    smoothTime: { value: 2, min: 0, max: 10 },

    faceControls: folder({
      offset: false,
      offsetScalar: { value: 50, min: 0, max: 100 },
      eyes: false,
    }),

    background: false,
    blur: { value: 0, min: 0, max: 1 },
  })
  const cc = gui.camera === 'cc'

  const raycaster = useThree((state) => state.raycaster)

  const [userCam, setUserCam] = useState<THREE.PerspectiveCamera | null>(null)

  const faceControlsRef = useRef<ElementRef<typeof FaceControls>>(null)
  const raycasterRef = useRef<ElementRef<typeof Raycaster>>(null)
  const [hit, setHit] = useState<THREE.Intersection | null>(null)

  const satelliteRef = useRef<THREE.Group>(null)
  const wrapperRef = useRef<THREE.Group>(null)

  const [pos] = useState(new THREE.Vector3())
  const [dir] = useState(new THREE.Vector3())
  const [satelliteWorldPos] = useState(new THREE.Vector3())
  const [satelliteWorldQuat] = useState(new THREE.Quaternion())
  const [current] = useState(() => new THREE.Object3D())
  useFrame((_, delta) => {
    if (!raycasterRef.current) return

    //
    // Update "own" raycaster (along faceControls' target)
    //
    if (faceControlsRef.current && gui.raycaster === 'own') {
      const { target } = faceControlsRef.current
      target.getWorldPosition(pos)
      target.getWorldDirection(dir)
      raycasterRef.current.raycaster.ray.origin.copy(pos)
      raycasterRef.current.raycaster.ray.direction.copy(dir.negate().normalize())
    }

    //
    // damp `wrapperRef` to `satelliteRef`
    //

    satelliteRef.current?.getWorldPosition(satelliteWorldPos)
    satelliteRef.current?.getWorldQuaternion(satelliteWorldQuat)
    const satelliteWorldRot = new THREE.Euler()
    satelliteWorldRot.setFromQuaternion(satelliteWorldQuat, 'XYZ')

    const eps = 1e-9
    const smoothtime = gui.smoothTime
    easing.damp3(current.position, satelliteWorldPos, smoothtime, delta, undefined, undefined, eps)
    easing.dampE(current.rotation, satelliteWorldRot, smoothtime, delta, undefined, undefined, eps)
    wrapperRef.current?.position.copy(current.position)
    wrapperRef.current?.rotation.copy(current.rotation)

    //
    // update `hit` for Tangent
    //

    const { hitsRef } = raycasterRef.current

    if (!hitsRef.current) return
    const hit = hitsRef.current[0]
    // console.log('hit', hit)
    setHit(hit)
  })

  return (
    <>
      <color attach="background" args={['#403c3f']} />
      {cc && <axesHelper raycast={() => null} />}
      {cc && <gridHelper raycast={() => null} />}

      <group position-z={-2}>
        <Resize width scale={2} key={gui.model}>
          {gui.model === 'pasteque' && <Pasteque rotation-z={(7 * Math.PI) / 180} rotation-x={(-1 * Math.PI) / 180} />}
          {gui.model === 'suzi' && (
            <>
              <Center top key={gui.model}>
                <Suzi rotation={[-0.63, 0, 0]} scale={2} />
              </Center>
              <Center top position={[-2, 0, 2]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.5, 64, 64]} />
                  <meshStandardMaterial color="#9d4b4b" />
                </mesh>
              </Center>
              <Center top position={[2.5, 0, 1]}>
                <mesh castShadow rotation={[0, Math.PI / 4, 0]}>
                  <boxGeometry args={[0.7, 0.7, 0.7]} />
                  <meshStandardMaterial color="#9d4b4b" />
                </mesh>
              </Center>

              <Environment files={suspend(city).default} />
            </>
          )}
          {gui.model === 'ball' && (
            <>
              <Sphere args={[1, 32, 32]}>
                {/* <meshStandardMaterial color="#eee" flatShading /> */}
                <meshPhysicalMaterial clearcoat={1} roughness={0} color="black" />
                <Helper type={VertexNormalsHelper} args={[0.04]} />
              </Sphere>
              <Environment
                files="https://storage.googleapis.com/abernier-portfolio/lebombo_2k.hdr"
                background={gui.background}
                blur={gui.blur}
              />
            </>
          )}
        </Resize>
      </group>

      {gui.raycaster === 'pointer' ? (
        <Raycaster
          ref={raycasterRef}
          raycaster={raycaster} // pass r3f's raycaster
        />
      ) : (
        <Raycaster ref={raycasterRef} args={[]} near={0} far={8} helper={cc && [1]} />
      )}

      <NormalGroup ref={satelliteRef} hit={hit} altitude={gui.distance}>
        <axesHelper raycast={() => null} scale={0.2} />
      </NormalGroup>

      <group ref={wrapperRef}>
        <Suspense fallback={null}>
          <FaceLandmarker>
            <FaceControls
              ref={faceControlsRef}
              camera={userCam ?? undefined}
              makeDefault
              offset={gui.offset}
              offsetScalar={gui.offsetScalar}
              eyes={gui.eyes}
              debug={cc}
              facemesh={{
                // position: [0, 1, 4],
                children: <meshStandardMaterial color="white" wireframe />,
              }}
            />
          </FaceLandmarker>
        </Suspense>
      </group>

      <PerspectiveCamera
        ref={(cam) => setUserCam(cam)}
        makeDefault={gui.camera === 'user'}
        fov={35}
        near={0.001}
        far={10}
      >
        {cc && <Helper type={THREE.CameraHelper} />}
      </PerspectiveCamera>
      <CameraControls />
    </>
  )
}

const NormalGroup = forwardRef<
  THREE.Group,
  { hit: THREE.Intersection | null; altitude?: number } & ComponentProps<'group'>
>(({ hit, altitude = 0, ...props }, fref) => {
  const satelliteRef = useRef<THREE.Group>(null)
  const ref = fref || satelliteRef

  return (
    <Tangent hit={hit}>
      <axesHelper raycast={() => null} scale={0.1} />
      <Sphere args={[0.01]} raycast={() => null}>
        <meshBasicMaterial color="green" />
      </Sphere>
      <group scale-z={-1} position-z={-altitude}>
        <group ref={ref} {...props} />
      </group>
    </Tangent>
  )
})

//
// Tangent
//

function Tangent({
  hit,
  ...props
}: {
  hit: THREE.Intersection | null
} & ComponentProps<'group'>) {
  const camera = useThree((state) => state.camera)

  const groupRef = useRef<THREE.Group>(null)

  //
  // https://chatgpt.com/share/675d6e25-1e0c-8011-b0a9-986bec7de762
  //

  useEffect(() => {
    if (!groupRef.current || !hit) return
    groupRef.current.position.copy(hit.point)

    // Oriente le groupe selon la normale du hit
    const normalMatrix = new THREE.Matrix4().lookAt(
      hit.point,
      hit.point.clone().add(hit.face?.normal || new THREE.Vector3(0, 0, 0)),
      camera.up
    )
    groupRef.current.quaternion.setFromRotationMatrix(normalMatrix)
  }, [camera.up, hit])

  return <group ref={groupRef} {...props} />
}

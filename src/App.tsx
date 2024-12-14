import * as THREE from 'three'

import { ComponentProps, ElementRef, Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useControls } from 'leva'
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

const city = import('@pmndrs/assets/hdri/city.exr')

import { FaceControls } from './tmp/FaceControls'
import { Raycaster } from './tmp/Raycaster'

import { Pasteque } from './Pasteque'
import { Suzi } from './Suzi'

export default function App() {
  return (
    <>
      <Canvas camera={{ position: [-1.5, 1, 2] }} shadows>
        <Scene />
      </Canvas>
    </>
  )
}

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

function Scene() {
  const gui = useControls({
    camera: { value: 'cc', options: ['user', 'cc'] },
    model: { value: 'ball', options: ['suzi', 'pasteque', 'ball'] },
    origin: { value: [-4, 1.1, 0.1] },
    direction: { value: [1, 0, 0] },
    distance: { value: 1, min: 0, max: 10 },
  })
  const debug = gui.camera === 'cc'

  const [userCam, setUserCam] = useState<THREE.PerspectiveCamera | null>(null)

  const raycasterRef = useRef<ElementRef<typeof Raycaster>>(null)
  const [hit, setHit] = useState<THREE.Intersection | null>(null)

  const target2Ref = useRef<THREE.Group>(null)
  const wrapperRef = useRef<THREE.Group>(null)

  const [pos] = useState(new THREE.Vector3())
  const [quat] = useState(new THREE.Quaternion())
  useFrame(() => {
    if (!raycasterRef.current) return

    const { hitsRef } = raycasterRef.current

    if (!hitsRef.current) return
    const hit = hitsRef.current[0]
    if (!hit) return
    setHit(hit)

    target2Ref.current?.getWorldPosition(pos)
    target2Ref.current?.getWorldQuaternion(quat)

    wrapperRef.current?.position.copy(pos)
    wrapperRef.current?.quaternion.copy(quat)
  })

  return (
    <>
      <color attach="background" args={['#403c3f']} />
      {debug && <axesHelper raycast={() => null} />}
      {debug && <gridHelper raycast={() => null} />}

      <Center top key={gui.model}>
        <Resize width scale={2} key={gui.model}>
          {gui.model === 'pasteque' && <Pasteque rotation-z={(7 * Math.PI) / 180} rotation-x={(-1 * Math.PI) / 180} />}
          {gui.model === 'suzi' && <Suzi rotation={[-0.63, 0, 0]} />}
          {gui.model === 'ball' && (
            <Sphere args={[1]}>
              <meshStandardMaterial color="#eee" flatShading />
              <Helper type={VertexNormalsHelper} args={[0.04]} />
            </Sphere>
          )}
        </Resize>
      </Center>

      <Raycaster ref={raycasterRef} origin={gui.origin} direction={gui.direction} near={1} far={8} helper={[1]} />

      <Tangent hit={hit}>
        <axesHelper raycast={() => null} scale={0.1} />
        <group scale-z={-1} position-z={-gui.distance}>
          <axesHelper raycast={() => null} />
          <group ref={target2Ref} />
        </group>
      </Tangent>

      <PerspectiveCamera
        ref={(cam) => setUserCam(cam)}
        makeDefault={gui.camera === 'user'}
        fov={40}
        near={0.1}
        far={50}
      >
        {debug && <Helper type={THREE.CameraHelper} />}
      </PerspectiveCamera>

      <group ref={wrapperRef}>
        <Suspense fallback={null}>
          <FaceLandmarker>
            <FaceControls
              camera={userCam ?? undefined}
              makeDefault
              offset={false}
              // smoothTime={1}
              // debug={debug}
            />
          </FaceLandmarker>
        </Suspense>
      </group>
      <CameraControls />

      <Environment files={suspend(city).default} />
    </>
  )
}

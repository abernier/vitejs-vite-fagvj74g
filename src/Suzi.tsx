import { useGLTF } from '@react-three/drei'
import { ComponentProps, ElementRef, forwardRef } from 'react'
import { suspend } from 'suspend-react'

const suzi = import(`@pmndrs/assets/models/suzi.glb`)

export const Suzi = forwardRef<ElementRef<'mesh'>, ComponentProps<'mesh'>>((props, ref) => {
  const { nodes } = useGLTF(suspend(suzi).default)
  return (
    <>
      <mesh ref={ref} castShadow receiveShadow geometry={nodes.mesh.geometry} {...props}>
        <meshStandardMaterial color="#9d4b4b" />
      </mesh>
    </>
  )
})

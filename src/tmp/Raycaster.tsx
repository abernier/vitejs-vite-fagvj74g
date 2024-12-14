import * as THREE from 'three'
// import * as React from 'react'
import { ComponentProps, forwardRef, RefObject, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useFrame, type Vector3 } from '@react-three/fiber'
// import { RaycasterHelper } from '@gsimone/three-raycaster-helper'
import { RaycasterHelper } from './RaycasterHelper'

import { useHelper } from './Helper'
import { Falsey } from 'utility-types'

type HelperArgs<T> = T extends [any, ...infer R] ? R : never

type RaycasterProps = Omit<ComponentProps<'raycaster'>, 'args'> & {
  /** Origin of the raycaster  */
  origin: Vector3
  /** Direction of the raycaster  */
  direction: Vector3
} & {
  /** Whether or not to display the RaycasterHelper - you can pass additional params for the ctor here */
  helper?: Falsey | HelperArgs<ConstructorParameters<typeof RaycasterHelper>>
}

type RaycasterApi = {
  raycaster: THREE.Raycaster
  hitsRef: RefObject<THREE.Intersection[]>
}

function toThreeVec3(v: Vector3) {
  return v instanceof THREE.Vector3 ? v : new THREE.Vector3(...(typeof v === 'number' ? [v, v, v] : v))
}

/**
 * `<raycaster>` wrapper, with a `helper` prop to visualize it
 */
export const Raycaster = forwardRef<RaycasterApi, RaycasterProps>(
  (
    {
      origin: _origin = new THREE.Vector3(-4, 1.1, 0.1),
      direction: _direction = new THREE.Vector3(1, 0, 0),
      near,
      far,
      helper = false,
      ...props
    },
    fref
  ) => {
    // const origin = toThreeVec3(_origin)
    // const direction = toThreeVec3(_direction)
    // console.log('Raycaster')

    const [raycaster] = useState(
      () => new THREE.Raycaster(new THREE.Vector3(-4, 1.1, 0.1), new THREE.Vector3(1, 0, 0), 0.25, 8)
    )
    window.raycaster = raycaster
    const hitsRef = useRef<THREE.Intersection[]>([])

    const raycasterRef = useRef<THREE.Raycaster>(null)
    const args = helper || [20]
    const raycasterHelperRef = useHelper(raycasterRef, RaycasterHelper, ...args)

    // Update the hits with intersection results
    useFrame(({ scene }) => {
      // if (!helper) return

      if (!raycasterHelperRef.current || !raycasterRef.current) return
      const hits = raycasterRef.current.intersectObjects(scene.children)
      // console.log('hits', hits)
      hitsRef.current = hits
      raycasterHelperRef.current.hits = hits
    })

    const api = useMemo<RaycasterApi>(() => ({ raycaster, hitsRef }), [raycaster])
    useImperativeHandle(fref, () => api, [api])

    return (
      <primitive
        ref={raycasterRef}
        object={raycaster}
        // {...{ origin, direction, near, far }}
        // {...props}
      />
    )
  }
)

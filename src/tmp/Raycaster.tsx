import * as THREE from 'three'
// import * as React from 'react'
import { forwardRef, RefObject, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type Vector3 } from '@react-three/fiber'
// import { RaycasterHelper } from '@gsimone/three-raycaster-helper'
import { RaycasterHelper } from './RaycasterHelper'

import { useHelper } from './Helper'
import { Falsey } from 'utility-types'

function toThreeVec3(v: Vector3) {
  return v instanceof THREE.Vector3 ? v : new THREE.Vector3(...(typeof v === 'number' ? [v, v, v] : v))
}

type HelperArgs<T> = T extends [any, ...infer R] ? R : never

type RaycasterProps = Partial<THREE.Raycaster> & {
  /** Origin of the raycaster  */
  origin: Vector3
  /** Direction of the raycaster  */
  direction: Vector3
} & {
  raycaster?: THREE.Raycaster
  /** Whether or not to display the RaycasterHelper - you can pass additional params for the ctor here */
  helper?: Falsey | HelperArgs<ConstructorParameters<typeof RaycasterHelper>>
}

type RaycasterApi = {
  raycaster: THREE.Raycaster
  hitsRef: RefObject<THREE.Intersection[]>
}

/**
 * `<raycaster>` wrapper, with a `helper` prop to visualize it
 */
export const Raycaster = forwardRef<RaycasterApi, RaycasterProps>(
  ({ raycaster: _raycaster, origin, direction, helper = false, ...props }, fref) => {
    const [r] = useState(() => new THREE.Raycaster(toThreeVec3(origin), toThreeVec3(direction)))
    const raycaster = _raycaster || r
    window.raycaster = raycaster

    const hitsRef = useRef<THREE.Intersection[]>([])

    const raycasterRef = useRef<THREE.Raycaster>(null)
    const args = helper || [20]
    const raycasterHelperRef = useHelper(helper && raycasterRef, RaycasterHelper, ...args)

    // Update the hits with intersection results
    useFrame(({ scene }) => {
      if (!raycasterRef.current) return

      const hits = raycasterRef.current.intersectObjects(scene.children)
      hitsRef.current = hits
      // console.log('hits', hits)

      if (helper && raycasterHelperRef.current) raycasterHelperRef.current.hits = hits
    })

    const api = useMemo<RaycasterApi>(() => ({ raycaster, hitsRef }), [raycaster])
    useImperativeHandle(fref, () => api, [api])

    return <primitive ref={raycasterRef} object={raycaster} {...props} />
  }
)

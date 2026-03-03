declare module 'react-simple-maps' {
  import { ComponentType, ReactNode, SVGProps } from 'react'

  // ---- ComposableMap ----
  export interface ComposableMapProps extends SVGProps<SVGSVGElement> {
    projection?: string
    projectionConfig?: {
      center?: [number, number]
      rotate?: [number, number, number]
      parallels?: [number, number]
      scale?: number
    }
    width?: number
    height?: number
    children?: ReactNode
  }
  export const ComposableMap: ComponentType<ComposableMapProps>

  // ---- Geographies ----
  export interface GeographiesProps {
    geography: string | Record<string, unknown>
    children: (data: { geographies: GeographyType[] }) => ReactNode
    parseGeographies?: (geos: GeographyType[]) => GeographyType[]
  }
  export interface GeographyType {
    rsmKey: string
    id?: string
    properties: Record<string, unknown>
    type: string
    geometry: Record<string, unknown>
    svgPath?: string
  }
  export const Geographies: ComponentType<GeographiesProps>

  // ---- Geography ----
  export interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: GeographyType
    style?: {
      default?: React.CSSProperties
      hover?: React.CSSProperties
      pressed?: React.CSSProperties
    }
  }
  export const Geography: ComponentType<GeographyProps>

  // ---- Marker ----
  export interface MarkerProps extends SVGProps<SVGGElement> {
    coordinates: [number, number]
    children?: ReactNode
  }
  export const Marker: ComponentType<MarkerProps>

  // ---- Annotation ----
  export interface AnnotationProps {
    subject: [number, number]
    dx?: number
    dy?: number
    connectorProps?: SVGProps<SVGPathElement>
    children?: ReactNode
  }
  export const Annotation: ComponentType<AnnotationProps>

  // ---- Line ----
  export interface LineProps extends SVGProps<SVGPathElement> {
    from: [number, number]
    to: [number, number]
    coordinates?: [number, number][]
    stroke?: string
    strokeWidth?: number
    fill?: string
  }
  export const Line: ComponentType<LineProps>

  // ---- Graticule ----
  export interface GraticuleProps extends SVGProps<SVGPathElement> {
    step?: [number, number]
    stroke?: string
  }
  export const Graticule: ComponentType<GraticuleProps>

  // ---- Sphere ----
  export interface SphereProps extends SVGProps<SVGPathElement> {}
  export const Sphere: ComponentType<SphereProps>

  // ---- ZoomableGroup ----
  export interface ZoomableGroupProps extends SVGProps<SVGGElement> {
    center?: [number, number]
    zoom?: number
    minZoom?: number
    maxZoom?: number
    translateExtent?: [[number, number], [number, number]]
    onMoveStart?: (event: unknown, position: unknown) => void
    onMove?: (event: unknown, position: unknown) => void
    onMoveEnd?: (event: unknown, position: unknown) => void
    children?: ReactNode
  }
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>

  // ---- Hooks ----
  export function useGeographies(props: {
    geography: string | Record<string, unknown>
  }): { geographies: GeographyType[] }

  // ---- Context ----
  export const MapContext: React.Context<unknown>
  export const MapProvider: ComponentType<{ children?: ReactNode }>
  export const ZoomPanContext: React.Context<unknown>
  export const ZoomPanProvider: ComponentType<{ children?: ReactNode }>
  export function useMapContext(): unknown
  export function useZoomPan(): unknown
  export function useZoomPanContext(): unknown
}

/**
 * Estilo claro do mapa: menos ruido para o trajeto do tecnico se ver.
 *
 * So o Google Maps o le (`customMapStyle`); no iOS, onde o provider e o
 * Apple Maps, e ignorado sem erro.
 */
export const lightMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f9f9f9' }]
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#555555' }]
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }]
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#e0e0e0' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0b0b0' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#d4d4d4' }]
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#eaeaea' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a0a0a0' }]
  }
];

export default lightMapStyle;

type Coordinate = { latitude: number; longitude: number };

function quadraticBezierCurve(
    p1: [number, number],
    p2: [number, number],
    controlPoint: [number, number],
    numPoints: number
): Coordinate[] {
    const points: Coordinate[] = [];
    const step = 1 / (numPoints - 1);

    for (let t = 0; t <= 1; t += step) {
        const x =
            (1 - t) ** 2 * p1[0] +
            2 * (1 - t) * t * controlPoint[0] +
            t ** 2 * p2[0];
        const y =
            (1 - t) ** 2 * p1[1] +
            2 * (1 - t) * t * controlPoint[1] +
            t ** 2 * p2[1];
        points.push({ latitude: x, longitude: y });
    }

    return points;
}

const calculateControlPoint = (
    p1: [number, number],
    p2: [number, number]
): [number, number] => {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const d = Math.sqrt(dx ** 2 + dy ** 2) || 1;
    const h = d * 2;
    const w = d / 2;
    const x_m = (p1[0] + p2[0]) / 2;
    const y_m = (p1[1] + p2[1]) / 2;

    const x_c = x_m + ((h * dy) / (2 * d)) * (w / d);
    const y_c = y_m - ((h * dx) / (2 * d)) * (w / d);

    return [x_c, y_c];
};

export const getPoints = (places: ({ latitude: number | undefined; longitude: number | undefined } | {
    latitude: number;
    longitude: number
})[]): Coordinate[] => {
    if (places.length < 2) return [];

    if (typeof places[0].latitude === 'undefined' || typeof places[0].longitude === 'undefined' ||
        typeof places[1].latitude === 'undefined' || typeof places[1].longitude === 'undefined') {
        return [];
    }

    //@ts-ignore
    const p1: [number, number] = [places[0].latitude, places[0].longitude];

    //@ts-ignore
    const p2: [number, number] = [places[1].latitude, places[1].longitude];
    const controlPoint = calculateControlPoint(p1, p2);

    return quadraticBezierCurve(p1, p2, controlPoint, 100);
};

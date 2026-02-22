//Image processor,
//This isnt my own code adapted from a guide i found online. I have made some minor adjustments to try improve the performance of the original code

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            resolve({ img, objectUrl });
        };
        img.onerror = (error) => {
            URL.revokeObjectURL(objectUrl);
            reject(error);
        };
        img.src = objectUrl;
    });
}

export function orderCorners(corners) {
    function distSquared(a, b) {//Avoid using sqrt where not needed
        return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    }

    const midpoint = {
        x: corners.reduce((sum, p) => sum + p.x, 0) / corners.length,
        y: corners.reduce((sum, p) => sum + p.y, 0) / corners.length,
    };

    //Find the max distance from the midpoint to determine the radius to use (2x max)
    let maxDistance = 0;
    for (const corner of corners) {
        const distance = Math.hypot(corner.x - midpoint.x, corner.y - midpoint.y);
        if (distance > maxDistance) {
            maxDistance = distance;
        }
    }

    const checkRadius = maxDistance * 2;
    const quadrants = [];
    let i = 0;
    for (let ySign = -1; ySign <= 1; ySign += 2) {
        for (let j = 1; j >= -1; j -= 2) {
            let xSign = j * ySign; //Flip x sign to preserve order going around
            quadrants[i] = {
                x: midpoint.x + xSign * checkRadius,
                y: midpoint.y + ySign * checkRadius,
            };
            i++;
        }
    }

    //Then, for in 4 rounds, find the nearest quadrant - corner pair and assign it
    const ordered = [null, null, null, null];
    for (let round = 0; round < 4; round++) {

        //Define the variables used to represent the best next step
        let bestDistSquared = Infinity;
        let bestCornerIndex = 0;
        let bestQuadrantIndex = 0;

        for (let cornerIndex = 0; cornerIndex < corners.length; cornerIndex++) {
            //If this has been sorted skip
            if (ordered.includes(cornerIndex)) continue;

            for (let quadrantIndex = 0; quadrantIndex < quadrants.length; quadrantIndex++) {
                //If this has been sorted skip
                if (ordered[quadrantIndex] !== null) continue;

                //Use dist squared since we dont need exact to compare,
                //This could be optimised by calculating ahead of time,
                //But this isnt that expensive
                const currentDistSquared = distSquared(
                    corners[cornerIndex], quadrants[quadrantIndex]
                );

                //Since this is better than current best, replace
                if (currentDistSquared < bestDistSquared) {
                    bestDistSquared = currentDistSquared;
                    bestCornerIndex = cornerIndex;
                    bestQuadrantIndex = quadrantIndex;
                }
            }
        }
        ordered[bestQuadrantIndex] = bestCornerIndex;
    }

    return ordered.map(idx => corners[idx]);
}

export function canvasToBlob(canvas, mimeType = "image/jpeg", quality = 0.92) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("Failed to create image blob"));
                return;
            }
            resolve(blob);
        }, mimeType, quality);
    });
}

function pointDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function findDocumentCorners(cv, edgeImage, width, height) {
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(
        edgeImage,
        contours,
        hierarchy,
        cv.RETR_LIST,
        cv.CHAIN_APPROX_SIMPLE,
    );

    let bestCorners = null;
    let smallestArea = Infinity;
    const centerX = width / 2;
    const centerY = height / 2;
    const minArea = (width * height) * 0.02; // At least 2% of the image area

    for (let index = 0; index < contours.size(); index++) {
        const contour = contours.get(index);
        const perimeter = cv.arcLength(contour, true);
        const approximation = new cv.Mat();
        cv.approxPolyDP(contour, approximation, 0.05 * perimeter, true);

        if (approximation.rows === 4) {
            const area = cv.contourArea(approximation);
            if (area > minArea && area < smallestArea) {
                const quadrants = new Set();
                const corners = [];
                for (let i = 0; i < 4; i++) {
                    const x = approximation.data32S[i * 2];
                    const y = approximation.data32S[i * 2 + 1];
                    corners.push({ x, y });
                    
                    let q = 0;
                    if (x >= centerX) q += 1;
                    if (y >= centerY) q += 2;
                    quadrants.add(q);
                }

                if (quadrants.size === 4) {
                    const isInside = cv.pointPolygonTest(approximation, new cv.Point(centerX, centerY), false) >= 0;
                    if (isInside) {
                        smallestArea = area;
                        bestCorners = corners;
                    }
                }
            }
        }

        approximation.delete();
        contour.delete();
    }

    hierarchy.delete();
    contours.delete();

    return bestCorners;
}

export function processImageForCorners(cv, sourceCanvas) {
    const source = cv.imread(sourceCanvas);
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const edges = new cv.Mat();

    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 30, 100);

    const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
    cv.dilate(edges, edges, kernel, new cv.Point(-1, -1), 2);
    cv.erode(edges, edges, kernel, new cv.Point(-1, -1), 1);
    kernel.delete();

    const detectedCorners = findDocumentCorners(cv, edges, source.cols, source.rows);

    source.delete();
    gray.delete();
    blurred.delete();
    edges.delete();

    if (!detectedCorners) return null;

    return orderCorners(detectedCorners);
}

export function warpPerspective(cv, sourceCanvas, orderedCorners) {
    const source = cv.imread(sourceCanvas);

    const widthTop = pointDistance(orderedCorners[0], orderedCorners[1]);
    const widthBottom = pointDistance(orderedCorners[3], orderedCorners[2]);
    const maxWidth = Math.max(1, Math.round(Math.max(widthTop, widthBottom)));

    const heightRight = pointDistance(orderedCorners[1], orderedCorners[2]);
    const heightLeft = pointDistance(orderedCorners[0], orderedCorners[3]);
    const maxHeight = Math.max(1, Math.round(Math.max(heightRight, heightLeft)));

    const sourceTransformPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        orderedCorners[0].x,
        orderedCorners[0].y,
        orderedCorners[1].x,
        orderedCorners[1].y,
        orderedCorners[2].x,
        orderedCorners[2].y,
        orderedCorners[3].x,
        orderedCorners[3].y,
    ]);
    const destinationTransformPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0,
        0,
        maxWidth - 1,
        0,
        maxWidth - 1,
        maxHeight - 1,
        0,
        maxHeight - 1,
    ]);

    const perspectiveTransform = cv.getPerspectiveTransform(
        sourceTransformPoints,
        destinationTransformPoints,
    );
    const cropped = new cv.Mat();
    cv.warpPerspective(
        source,
        cropped,
        perspectiveTransform,
        new cv.Size(maxWidth, maxHeight),
    );

    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = cropped.cols;
    croppedCanvas.height = cropped.rows;
    cv.imshow(croppedCanvas, cropped);

    source.delete();
    sourceTransformPoints.delete();
    destinationTransformPoints.delete();
    perspectiveTransform.delete();
    cropped.delete();

    return croppedCanvas;
}

export async function createDocumentCropPreview(file, cv) {
    const { img, objectUrl } = await loadImageFromFile(file);

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = img.width;
    sourceCanvas.height = img.height;
    const sourceContext = sourceCanvas.getContext("2d", {
        willReadFrequently: true,
    });
    sourceContext.drawImage(img, 0, 0);

    const orderedCorners = processImageForCorners(cv, sourceCanvas) || [
        { x: 0, y: 0 },
        { x: sourceCanvas.width - 1, y: 0 },
        { x: sourceCanvas.width - 1, y: sourceCanvas.height - 1 },
        { x: 0, y: sourceCanvas.height - 1 },
    ];

    const croppedCanvas = warpPerspective(cv, sourceCanvas, orderedCorners);
    const croppedBlob = await canvasToBlob(croppedCanvas);
    const croppedPreviewUrl = URL.createObjectURL(croppedBlob);

    URL.revokeObjectURL(objectUrl);

    return {
        sourceCanvas,
        initialCorners: orderedCorners,
        croppedBlob,
        croppedPreviewUrl,
        cleanup() {
            URL.revokeObjectURL(croppedPreviewUrl);
        },
    };
}

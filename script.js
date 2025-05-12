const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const expressionList = document.getElementById('expressionList');
const expressionChartCtx = document.getElementById('expressionChart').getContext('2d');
let isDetecting = false;

// Load all required face-api.js models
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models')
]).then(startVideo);

// Start the webcam
function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => console.error("Error accessing webcam: ", err));
}

// When the video starts playing
video.addEventListener('playing', () => {
    // Resize the canvas to match video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const expressionChart = new Chart(expressionChartCtx, {
        type: 'pie', // Change chart type to 'pie'
        data: {
            labels: [], // Nama ekspresi
            datasets: [{
                label: 'Confidence (%)',
                data: [], // Nilai confidence
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)',
                    'rgba(255, 159, 64, 0.5)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });

    // Start face detection loop
    setInterval(async () => {
        if (!isDetecting) return;

        const detections = await faceapi.detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceExpressions().withAgeAndGender();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        // Clear canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw face boxes and expressions
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        // Draw gender and age labels
        resizedDetections.forEach(detection => {
            const { age, gender, genderProbability } = detection;
            const box = detection.detection.box;
            const label = `${gender} (${(genderProbability * 100).toFixed(1)}%) - Age: ${age.toFixed(0)}`;
            const drawBox = new faceapi.draw.DrawBox(box, { label });
            drawBox.draw(canvas);
            console.log(gender);
        });

        // Display results
        resizedDetections.forEach(detection => {
            const expressions = detection.expressions;
            const sortedExpressions = Object.entries(expressions).sort((a, b) => b[1] - a[1]);

            // Update expression list
            expressionList.innerHTML = '';
            sortedExpressions.forEach(([expression, confidence]) => {
                const li = document.createElement('li');
                li.textContent = `${expression}: ${(confidence * 100).toFixed(2)}%`;
                expressionList.appendChild(li);
            });

            // Update chart data
            expressionChart.data.labels = sortedExpressions.map(([expression]) => expression);
            expressionChart.data.datasets[0].data = sortedExpressions.map(([_, confidence]) => (confidence * 100).toFixed(2));
            expressionChart.update();
        });
    }, 100);
});

// Event listeners
startButton.addEventListener('click', () => {
    isDetecting = true;
});

stopButton.addEventListener('click', () => {
    isDetecting = false;
});


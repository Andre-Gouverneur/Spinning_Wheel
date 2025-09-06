document.addEventListener('DOMContentLoaded', () => {
    // Check if the current page is the main page
    if (window.location.pathname === '/') {
        // --- Main Spinning Wheel Logic ---
        const spinButton = document.getElementById('spin-button');
        const resultMessage = document.getElementById('result-message');
        const wheel = document.getElementById('wheel');

        let prizesData = [];
        let totalProbability = 0;

        // Function to fetch prize data and build the wheel
        async function buildWheel() {
            try {
                // Fetch prize data from the admin endpoint
                const response = await fetch('/admin');
                const parser = new DOMParser();
                const doc = parser.parseFromString(await response.text(), 'text/html');
                const rows = doc.querySelectorAll('#prize-table tbody tr');
                
                prizesData = Array.from(rows).map(row => {
                    const inputs = row.querySelectorAll('input');
                    const name = inputs[0].value;
                    const probability = parseFloat(inputs[1].value);
                    return { name, probability };
                });

                // Clear any existing segments
                wheel.innerHTML = '';
                
                // Calculate total probability
                totalProbability = prizesData.reduce((sum, p) => sum + p.probability, 0);

                let cumulativeAngle = 0;
                let conicGradientString = '';
                const colors = ['#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#1abc9c', '#e67e22', '#c0392b'];

                prizesData.forEach((prize, index) => {
                    const angle = (prize.probability / totalProbability) * 360;
                    
                    // Create a wrapper for the text
                    const textWrapper = document.createElement('div');
                    textWrapper.classList.add('segment-text-wrapper');
                    textWrapper.style.transform = `rotate(${cumulativeAngle + (angle / 2)}deg)`;
                    wheel.appendChild(textWrapper);

                    // Create the text label itself
                    const textSegment = document.createElement('div');
                    textSegment.classList.add('segment-text');
                    textSegment.textContent = prize.name;
                    textWrapper.appendChild(textSegment);

                    // Build the conic-gradient string
                    const color = colors[index % colors.length];
                    const startAngle = cumulativeAngle;
                    const endAngle = cumulativeAngle + angle;
                    conicGradientString += `${color} ${startAngle}deg ${endAngle}deg, `;
                    cumulativeAngle += angle;
                });
                
                // Set the background of the wheel
                wheel.style.background = `conic-gradient(${conicGradientString.slice(0, -2)})`;

            } catch (error) {
                console.error('Failed to load prize data:', error);
                resultMessage.textContent = 'Error loading wheel data.';
            }
        }

        // Spin button click handler
        spinButton.addEventListener('click', async () => {
            spinButton.disabled = true;
            resultMessage.textContent = 'Spinning...';

            try {
                const response = await fetch('/spin');
                const data = await response.json();

                if (data.outcome) {
                    const prizeIndex = prizesData.findIndex(p => p.name === data.outcome);
                    if (prizeIndex !== -1) {
                        const spinDegrees = calculateSpinDegrees(prizeIndex);
                        wheel.style.transition = 'transform 4s cubic-bezier(0.1, 0.7, 1.0, 0.1)';
                        wheel.style.transform = `rotate(${spinDegrees}deg)`;

                        // Wait for the animation to finish
                        setTimeout(() => {
                            resultMessage.textContent = `You won: ${data.outcome}!`;
                            spinButton.disabled = false;
                            wheel.style.transition = 'none';
                            wheel.style.transform = `rotate(${spinDegrees % 360}deg)`;
                        }, 4000); // Must match CSS transition duration
                    } else {
                        resultMessage.textContent = 'Prize not found.';
                        spinButton.disabled = false;
                    }
                } else {
                    resultMessage.textContent = 'No prizes available.';
                    spinButton.disabled = false;
                }
            } catch (error) {
                resultMessage.textContent = 'An error occurred. Please try again.';
                spinButton.disabled = false;
                console.error('Spinning error:', error);
            }
        });

        // Helper function to calculate the rotation degrees
        function calculateSpinDegrees(prizeIndex) {
            let spinDegrees = 3600; // Spin multiple full circles
            let cumulativeProbability = 0;
            for (let i = 0; i < prizeIndex; i++) {
                cumulativeProbability += prizesData[i].probability;
            }
            const angleForPrize = (cumulativeProbability + prizesData[prizeIndex].probability / 2) * 360 / totalProbability;
            spinDegrees += (360 - angleForPrize);
            return spinDegrees;
        }

        // Build the wheel when the page loads
        buildWheel();

    } else if (window.location.pathname === '/admin') {
        // --- Admin Panel Logic ---
        const saveButton = document.getElementById('save-button');
        const addRowButton = document.getElementById('add-row');
        const prizeTableBody = document.querySelector('#prize-table tbody');
        const saveMessage = document.getElementById('save-message');

        // Add event listeners for delete buttons
        prizeTableBody.addEventListener('click', async (event) => {
            if (event.target.classList.contains('delete-btn')) {
                const row = event.target.closest('tr');
                const prizeName = row.querySelector('input[type="text"]').value;
                
                if (confirm(`Are you sure you want to delete the prize "${prizeName}"?`)) {
                    try {
                        const response = await fetch('/delete_prize', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ name: prizeName })
                        });

                        const data = await response.json();
                        if (data.success) {
                            row.remove(); // Remove the row from the table
                            saveMessage.textContent = data.message;
                            saveMessage.style.color = '#2ecc71';
                        } else {
                            saveMessage.textContent = 'Error: ' + data.message;
                            saveMessage.style.color = '#e74c3c';
                        }
                    } catch (error) {
                        saveMessage.textContent = 'An error occurred while deleting.';
                        saveMessage.style.color = '#e74c3c';
                        console.error('Delete error:', error);
                    }
                }
            }
        });

        // Add a new row to the table
        addRowButton.addEventListener('click', () => {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="text" value=""></td>
                <td><input type="number" step="0.01" min="0" value="0"></td>
                <td><input type="number" min="0" value="0"></td>
                <td><button class="delete-btn">Delete</button></td>
            `;
            prizeTableBody.appendChild(newRow);
        });

        // Save changes to the backend
        saveButton.addEventListener('click', async () => {
            const prizes = [];
            const rows = prizeTableBody.querySelectorAll('tr');

            rows.forEach(row => {
                const inputs = row.querySelectorAll('input');
                prizes.push({
                    name: inputs[0].value,
                    probability: inputs[1].value,
                    usage_limit: inputs[2].value
                });
            });

            try {
                const response = await fetch('/save_admin_changes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ prizes: prizes })
                });

                const data = await response.json();
                if (data.success) {
                    saveMessage.textContent = data.message;
                    saveMessage.style.color = '#2ecc71';
                } else {
                    saveMessage.textContent = 'Error: ' + data.message;
                    saveMessage.style.color = '#e74c3c';
                }
            } catch (error) {
                saveMessage.textContent = 'An error occurred while saving.';
                saveMessage.style.color = '#e74c3c';
                console.error('Save error:', error);
            }
        });
    }
});
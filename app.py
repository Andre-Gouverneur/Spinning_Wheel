from flask import Flask, render_template, jsonify, request
import random

app = Flask(__name__)

# This is your global list of prizes
prizes = [
    {'name': 'GET A CLUE', 'probability': 20, 'usage_limit': 0},
    {'name': 'DETOUR', 'probability': 20, 'usage_limit': 1},
    {'name': 'ROADBLOCK', 'probability': 60, 'usage_limit': 0}
]

def update_probabilities():
    global prizes
    total_prob = sum(p['probability'] for p in prizes)
    if total_prob > 0:
        for p in prizes:
            p['probability'] = round((p['probability'] / total_prob) * 100, 2)

def spin_wheel():
    global prizes
    
    # Filter out prizes that have reached their usage limit
    available_prizes = [p for p in prizes if p['usage_limit'] == 0 or p['usage_limit'] > 0]
    
    if not available_prizes:
        return "No Prizes Available"
    
    total_prob_available = sum(p['probability'] for p in available_prizes)
    
    if total_prob_available == 0:
        return "No Prizes Available"

    cumulative_probabilities = []
    current_cumulative = 0
    for prize in available_prizes:
        current_cumulative += (prize['probability'] / total_prob_available) * 100
        cumulative_probabilities.append(current_cumulative)

    spin_result = random.uniform(0, 100)

    for i, prob in enumerate(cumulative_probabilities):
        if spin_result <= prob:
            winning_prize = available_prizes[i]
            
            if winning_prize['usage_limit'] > 0:
                winning_prize['usage_limit'] -= 1
            
            return winning_prize['name']
            
    return "Try Again"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html', prizes=prizes)

@app.route('/spin')
def spin():
    outcome = spin_wheel()
    return jsonify({'outcome': outcome})

@app.route('/save_admin_changes', methods=['POST'])
def save_admin_changes():
    data = request.get_json()
    new_prizes = data.get('prizes', [])
    
    global prizes
    prizes = []
    for p in new_prizes:
        prizes.append({
            'name': p['name'],
            'probability': float(p['probability']),
            'usage_limit': int(p['usage_limit'])
        })
    
    update_probabilities()

    return jsonify({'success': True, 'message': 'Changes saved successfully.'})

@app.route('/delete_prize', methods=['POST'])
def delete_prize():
    data = request.get_json()
    name_to_delete = data.get('name')
    
    global prizes
    prizes = [p for p in prizes if p['name'] != name_to_delete]
    
    update_probabilities()

    return jsonify({'success': True, 'message': f'Prize "{name_to_delete}" deleted.'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
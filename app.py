from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
import jwt
from datetime import datetime, timedelta
import secrets
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = '41de8fadeefa6af18971c9d1a4c5f90e1e3e03f089d309ed3de1a1aa95ce89d8'
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    f_name = db.Column(db.String(50), nullable=False)
    l_name = db.Column(db.String(50), nullable=False)
    email_id = db.Column(db.String(100), unique=True, nullable=False)
    phone_number = db.Column(db.String(15), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    created_date = db.Column(db.DateTime, default=datetime.utcnow)

# def generate_access_token(user_id):
#     expiration_time = datetime.utcnow() + timedelta(minutes=3)
#     payload = {'exp': expiration_time, 'sub': user_id}
#     # return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256').decode('utf-8')
#     return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
def generate_access_token(user_id):
    expiration_time = datetime.utcnow() + timedelta(minutes=3)
    payload = {'exp': expiration_time, 'sub': user_id}

    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_access_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        print(f"Decoded Payload: {payload}")
        return payload['sub']
    except jwt.ExpiredSignatureError:
        print("Token has expired.")
        return None
    except jwt.InvalidTokenError:
        print("Invalid token.")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get-token', methods=['GET'])
def get_token():
    # For simplicity, we'll use a dummy user_id here
    dummy_user_id = 1
    access_token = generate_access_token(dummy_user_id)
    return jsonify({'access_token': access_token})

@app.route('/add-user', methods=['POST'])
def add_user():
    access_token = request.headers.get('Authorization')
    print(f"Received access token: {access_token}")
    user_id = verify_access_token(access_token)
    print(f"Decoded user_id: {user_id}")
    if user_id is None:
        return jsonify({'error': 'Invalid or expired access token'}), 401

    data = request.get_json()
    try:
        new_user = User(id=user_id, **data)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'User added successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/list-users', methods=['GET'])
def list_users():
    access_token = request.headers.get('Authorization')
    user_id = verify_access_token(access_token)
    if user_id is None:
        return jsonify({'error': 'Invalid or expired access token'}), 401

    page = int(request.args.get('page', 1))
    per_page = 5
    users = User.query.filter_by(user_id=user_id).order_by(User.created_date).paginate(page, per_page, error_out=False)

    next_url = f'/list-users?page={page + 1}' if users.has_next else None
    prev_url = f'/list-users?page={page - 1}' if users.has_prev else None

    user_list = [{'id': user.id, 'f_name': user.f_name, 'l_name': user.l_name, 'email_id': user.email_id,
                  'phone_number': user.phone_number, 'address': user.address, 'created_date': user.created_date}
                 for user in users.items]

    return jsonify({'users': user_list, 'next_url': next_url, 'prev_url': prev_url})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)

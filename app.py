from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os


app = Flask(__name__)

# Database configuration
# For local development, use SQLite
# For production with PostgreSQL, use:
# app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:nonu123nonu@localhost/expense_tracker'


# Using SQLite for easier local development
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:nonu123nonu@localhost/expense_tracker'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'

db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    date = db.Column(db.String(20), nullable=False)
    is_necessary = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    alternatives = db.relationship('Alternative', backref='expense', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'description': self.description,
            'amount': self.amount,
            'category': self.category,
            'date': self.date,
            'is_necessary': self.is_necessary,
            'notes': self.notes,
            'created_at': self.created_at.isoformat()
        }

class Alternative(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expense.id'), nullable=False)
    suggestion = db.Column(db.String(200), nullable=False)
    savings = db.Column(db.Float, nullable=False)
    benefits = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'expense_id': self.expense_id,
            'suggestion': self.suggestion,
            'savings': self.savings,
            'benefits': self.benefits,
            'created_at': self.created_at.isoformat()
        }

# Create tables
with app.app_context():
    db.create_all()
    print("Database tables created successfully!")

# Routes
@app.route("/")
def index():
    view = request.args.get("view")

    if "user_id" not in session:
        if view == "signup":
            return render_template("index.html", page="signup")
        return render_template("index.html", page="login")

    return render_template("index.html", page="dashboard")

@app.route("/signup", methods=["POST"])
def signup():
    username = request.form["username"]
    email = request.form["email"]
    password = request.form["password"]

    hashed_password = generate_password_hash(password)

    new_user = User(username=username, email=email, password_hash=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    return render_template("index.html", page="login")

@app.route("/login", methods=["POST"])
def login():
    username = request.form["username"]
    password = request.form["password"]

    user = User.query.filter_by(username=username).first()

    if user and check_password_hash(user.password_hash, password):
        session["user_id"] = user.id
        return redirect("/")
    else:
        return render_template("index.html", page="login", error="Invalid credentials")


@app.route("/logout")
def logout():
    session.pop("user_id", None)
    return redirect("/")



# API Endpoints

# Get all expenses
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    try:
        expenses = Expense.query.order_by(Expense.date.desc()).all()
        return jsonify({
            'success': True,
            'expenses': [expense.to_dict() for expense in expenses]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Add new expense
@app.route('/api/expenses', methods=['POST'])
def add_expense():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['description', 'amount', 'category', 'date']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        new_expense = Expense(
            description=data['description'],
            amount=float(data['amount']),
            category=data['category'],
            date=data['date'],
            is_necessary=data.get('is_necessary', True),
            notes=data.get('notes', '')
        )
        
        db.session.add(new_expense)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Expense added successfully',
            'expense': new_expense.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Update expense
@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    try:
        expense = Expense.query.get_or_404(expense_id)
        data = request.get_json()
        
        expense.description = data.get('description', expense.description)
        expense.amount = float(data.get('amount', expense.amount))
        expense.category = data.get('category', expense.category)
        expense.date = data.get('date', expense.date)
        expense.is_necessary = data.get('is_necessary', expense.is_necessary)
        expense.notes = data.get('notes', expense.notes)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Expense updated successfully',
            'expense': expense.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Delete expense
@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    try:
        expense = Expense.query.get_or_404(expense_id)
        db.session.delete(expense)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Expense deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Get all alternatives
@app.route('/api/alternatives', methods=['GET'])
def get_alternatives():
    try:
        alternatives = Alternative.query.order_by(Alternative.created_at.desc()).all()
        return jsonify({
            'success': True,
            'alternatives': [alt.to_dict() for alt in alternatives]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Add new alternative
@app.route('/api/alternatives', methods=['POST'])
def add_alternative():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['expense_id', 'suggestion', 'savings']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Check if expense exists
        expense = Expense.query.get(data['expense_id'])
        if not expense:
            return jsonify({
                'success': False,
                'error': 'Expense not found'
            }), 404
        
        new_alternative = Alternative(
            expense_id=data['expense_id'],
            suggestion=data['suggestion'],
            savings=float(data['savings']),
            benefits=data.get('benefits', '')
        )
        
        db.session.add(new_alternative)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Alternative added successfully',
            'alternative': new_alternative.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Delete alternative
@app.route('/api/alternatives/<int:alt_id>', methods=['DELETE'])
def delete_alternative(alt_id):
    try:
        alternative = Alternative.query.get_or_404(alt_id)
        db.session.delete(alternative)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Alternative deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Get statistics
@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        expenses = Expense.query.all()
        
        total = sum(e.amount for e in expenses)
        necessary = sum(e.amount for e in expenses if e.is_necessary)
        unnecessary = sum(e.amount for e in expenses if not e.is_necessary)
        
        # Calculate potential savings from alternatives
        alternatives = Alternative.query.all()
        potential_savings = sum(alt.savings for alt in alternatives)
        
        # Category breakdown
        categories = {}
        for expense in expenses:
            if expense.category not in categories:
                categories[expense.category] = 0
            categories[expense.category] += expense.amount
        
        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'necessary': necessary,
                'unnecessary': unnecessary,
                'potential_savings': potential_savings,
                'categories': categories,
                'expense_count': len(expenses)
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

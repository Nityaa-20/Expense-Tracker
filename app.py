from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os


app = Flask(__name__)


# app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:nonu123nonu@localhost/expense_tracker'



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
    currency = db.Column(db.String(5), default="$")
    monthly_budget = db.Column(db.Float, default=0)


class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    date = db.Column(db.String(20), nullable=False)
    is_necessary = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    
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

    # show signup page
    if view == "signup":
        return render_template("index.html", page="signup")

    # if user not logged in
    if "user_id" not in session:
        return render_template("index.html", page="login")

    user = db.session.get(User, session["user_id"])

    return render_template(
        "index.html",
        page="dashboard",
        username=user.username,
        currency=user.currency
    )

@app.route("/signup", methods=["POST"])
def signup():
    username = request.form["username"]
    email = request.form["email"]
    password = request.form["password"]
    currency = request.form["currency"]


    hashed_password = generate_password_hash(password)

    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()

    if existing_user:
        return render_template(
            "index.html",
            page="signup",
            error="User already exists"
        )

    new_user = User(
    username=username,
    email=email,
    password_hash=hashed_password,
    currency=currency
    )

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
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "error": "Not logged in"
            }), 401

        expenses = Expense.query.filter_by(
            user_id=session["user_id"]
        ).order_by(Expense.date.desc()).all()

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
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "error": "Not logged in"
            }), 401
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
            notes=data.get('notes', ''),
            user_id=session["user_id"]   
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
        expense = Expense.query.filter_by(
            id=expense_id,
            user_id=session["user_id"]
        ).first_or_404()
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
        expense = Expense.query.filter_by(
            id=expense_id,
            user_id=session["user_id"]
        ).first_or_404()
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
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "error": "Not logged in"
            }), 401
        alternatives = (
            Alternative.query
            .join(Expense)
            .filter(Expense.user_id == session["user_id"])
            .order_by(Alternative.created_at.desc())
            .all()
        )
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
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "error": "Not logged in"
            }), 401
         
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
        expense = Expense.query.filter_by(
            id=data['expense_id'],
            user_id=session["user_id"]
        ).first()
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
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "error": "Not logged in"
            }), 401
        alternative = (
            Alternative.query
            .join(Expense)
            .filter(
                Alternative.id == alt_id,
                Expense.user_id == session["user_id"]
            )
            .first_or_404()
        )
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
        expenses = Expense.query.filter_by(user_id=session["user_id"]).all()
        
        total = sum(e.amount for e in expenses)
        necessary = sum(e.amount for e in expenses if e.is_necessary)
        unnecessary = sum(e.amount for e in expenses if not e.is_necessary)
        
        # Calculate potential savings from alternatives
        alternatives = (
            Alternative.query
            .join(Expense)
            .filter(Expense.user_id == session["user_id"])
            .all()
        )
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
    
@app.route("/api/budget", methods=["GET"])
def get_budget():
    if "user_id" not in session:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    user = User.query.get(session["user_id"])

    return jsonify({
        "success": True,
        "budget": user.monthly_budget or 0
    })

@app.route("/api/budget", methods=["POST"])
def update_budget():
    if "user_id" not in session:
        return jsonify({"success": False, "error": "Not logged in"}), 401

    data = request.get_json()

    user = User.query.get(session["user_id"])
    user.monthly_budget = float(data.get("budget", 0))

    db.session.commit()

    return jsonify({
        "success": True,
        "budget": user.monthly_budget
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

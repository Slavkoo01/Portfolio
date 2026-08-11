from flask import Blueprint

test_bp = Blueprint("test", __name__)


@test_bp.route("/")
def home():
    return {
        "message": "Flask works"
    }
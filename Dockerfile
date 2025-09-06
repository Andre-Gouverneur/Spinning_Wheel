# Use a lightweight Python base image
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install dependencies first
# This is a Docker best practice to leverage layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port your Flask app will run on
EXPOSE 5000

# Set an environment variable for Flask to know where to find the app
ENV FLASK_APP=app.py

# The command to run your application using Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
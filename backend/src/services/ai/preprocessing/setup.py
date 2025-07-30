#!/usr/bin/env python3
"""
Setup script for CropGuard Image Preprocessing Service
Installs Python dependencies and verifies the setup
"""

import subprocess
import sys
import os
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major != 3 or version.minor < 8:
        print(f"Error: Python 3.8+ is required, but you have {version.major}.{version.minor}")
        return False
    
    print(f"✓ Python {version.major}.{version.minor}.{version.micro} is compatible")
    return True

def install_dependencies():
    """Install required Python packages"""
    requirements_file = Path(__file__).parent / 'requirements.txt'
    
    if not requirements_file.exists():
        print("Error: requirements.txt not found")
        return False
    
    print("Installing Python dependencies...")
    try:
        subprocess.check_call([
            sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)
        ])
        print("✓ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        return False

def test_imports():
    """Test if all required modules can be imported"""
    required_modules = [
        ('PIL', 'Pillow'),
        ('cv2', 'opencv-python'),
        ('numpy', 'numpy')
    ]
    
    print("Testing module imports...")
    for module_name, package_name in required_modules:
        try:
            __import__(module_name)
            print(f"✓ {package_name} imported successfully")
        except ImportError:
            print(f"✗ Failed to import {package_name}")
            return False
    
    return True

def test_image_processor():
    """Test the image processor with a simple operation"""
    try:
        from PIL import Image
        import numpy as np
        
        # Create a simple test image
        test_image = Image.new('RGB', (100, 100), color='green')
        
        # Test basic operations
        resized = test_image.resize((50, 50))
        array = np.array(test_image)
        
        print("✓ Image processing operations work correctly")
        return True
    except Exception as e:
        print(f"✗ Image processing test failed: {e}")
        return False

def main():
    """Main setup function"""
    print("CropGuard Image Preprocessing Service Setup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Test imports
    if not test_imports():
        sys.exit(1)
    
    # Test image processor
    if not test_image_processor():
        sys.exit(1)
    
    print("\n✓ Setup completed successfully!")
    print("\nYou can now run the image processor:")
    print(f"python {Path(__file__).parent / 'image_processor.py'} --help")

if __name__ == '__main__':
    main()
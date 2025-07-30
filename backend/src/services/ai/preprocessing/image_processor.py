#!/usr/bin/env python3
"""
CropGuard Image Preprocessing Service
Optimizes crop images for AI analysis with resize, normalization, and enhancement
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Tuple, Optional, Any
import logging

# Image processing libraries
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import numpy as np
import cv2

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('CropGuardImageProcessor')

class CropImageProcessor:
    """
    Advanced image processor for crop analysis optimization
    """
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = {
            'target_size': (512, 512),  # Target size for AI analysis
            'quality': 95,  # JPEG quality for output
            'brightness_threshold': 0.3,  # Minimum brightness level
            'contrast_enhancement': 1.2,  # Contrast enhancement factor
            'sharpness_enhancement': 1.1,  # Sharpness enhancement factor
            'noise_reduction': True,  # Apply noise reduction
            'color_correction': True,  # Apply color correction
            'auto_crop': True,  # Auto-crop to focus on plant matter
            **(config or {})
        }
        
        # Supported input formats
        self.supported_formats = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}
        
        # Create processing statistics
        self.stats = {
            'processed_count': 0,
            'error_count': 0,
            'avg_processing_time': 0.0
        }

    def process_image(self, input_path: str, output_path: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Process a single crop image for AI analysis
        
        Args:
            input_path: Path to input image
            output_path: Path to save processed image
            metadata: Optional metadata about the image
            
        Returns:
            Dictionary with processing results and statistics
        """
        import time
        start_time = time.time()
        
        try:
            logger.info(f"Processing image: {input_path}")
            
            # Validate input
            self._validate_input(input_path)
            
            # Load image
            image = self._load_image(input_path)
            original_size = image.size
            
            # Apply preprocessing pipeline
            processed_image = self._preprocess_pipeline(image, metadata)
            
            # Save processed image
            self._save_image(processed_image, output_path)
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            # Update statistics
            self.stats['processed_count'] += 1
            self.stats['avg_processing_time'] = (
                (self.stats['avg_processing_time'] * (self.stats['processed_count'] - 1) + processing_time) 
                / self.stats['processed_count']
            )
            
            # Prepare result
            result = {
                'success': True,
                'input_path': input_path,
                'output_path': output_path,
                'original_size': original_size,
                'processed_size': processed_image.size,
                'processing_time': processing_time,
                'file_size_before': os.path.getsize(input_path),
                'file_size_after': os.path.getsize(output_path),
                'preprocessing_applied': self._get_applied_preprocessing(),
                'quality_metrics': self._calculate_quality_metrics(processed_image),
                'timestamp': time.time()
            }
            
            logger.info(f"Image processed successfully in {processing_time:.2f}s")
            return result
            
        except Exception as e:
            self.stats['error_count'] += 1
            logger.error(f"Error processing image {input_path}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'input_path': input_path,
                'processing_time': time.time() - start_time
            }

    def _validate_input(self, input_path: str) -> None:
        """Validate input image file"""
        path = Path(input_path)
        
        if not path.exists():
            raise FileNotFoundError(f"Input image not found: {input_path}")
        
        if path.suffix.lower() not in self.supported_formats:
            raise ValueError(f"Unsupported image format: {path.suffix}")
        
        # Check file size (max 20MB)
        if path.stat().st_size > 20 * 1024 * 1024:
            raise ValueError("Image file too large (max 20MB)")

    def _load_image(self, input_path: str) -> Image.Image:
        """Load and prepare image for processing"""
        try:
            image = Image.open(input_path)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Fix orientation based on EXIF data
            image = ImageOps.exif_transpose(image)
            
            return image
            
        except Exception as e:
            raise ValueError(f"Failed to load image: {str(e)}")

    def _preprocess_pipeline(self, image: Image.Image, metadata: Optional[Dict] = None) -> Image.Image:
        """
        Apply the complete preprocessing pipeline
        """
        # Step 1: Auto-crop to focus on plant matter (if enabled)
        if self.config['auto_crop']:
            image = self._auto_crop_plant(image)
        
        # Step 2: Resize to target dimensions
        image = self._smart_resize(image)
        
        # Step 3: Lighting normalization
        image = self._normalize_lighting(image)
        
        # Step 4: Color correction
        if self.config['color_correction']:
            image = self._correct_colors(image)
        
        # Step 5: Enhance contrast and sharpness
        image = self._enhance_quality(image)
        
        # Step 6: Noise reduction (final step)
        if self.config['noise_reduction']:
            image = self._reduce_noise(image)
        
        return image

    def _auto_crop_plant(self, image: Image.Image) -> Image.Image:
        """
        Intelligent cropping to focus on plant matter using edge detection
        """
        try:
            # Convert to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Create mask for plant matter (green regions)
            hsv = cv2.cvtColor(cv_image, cv2.COLOR_BGR2HSV)
            
            # Define range for green colors (plants)
            lower_green = np.array([25, 40, 40])
            upper_green = np.array([85, 255, 255])
            
            mask = cv2.inRange(hsv, lower_green, upper_green)
            
            # Find contours
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if contours:
                # Find the largest contour (main plant)
                largest_contour = max(contours, key=cv2.contourArea)
                
                # Get bounding box
                x, y, w, h = cv2.boundingRect(largest_contour)
                
                # Add padding (10% of image size)
                padding_x = int(image.width * 0.1)
                padding_y = int(image.height * 0.1)
                
                x = max(0, x - padding_x)
                y = max(0, y - padding_y)
                w = min(image.width - x, w + 2 * padding_x)
                h = min(image.height - y, h + 2 * padding_y)
                
                # Crop image
                cropped = image.crop((x, y, x + w, y + h))
                logger.debug(f"Auto-cropped from {image.size} to {cropped.size}")
                return cropped
        
        except Exception as e:
            logger.warning(f"Auto-crop failed, using original image: {str(e)}")
        
        return image

    def _smart_resize(self, image: Image.Image) -> Image.Image:
        """
        Resize image to target size while maintaining aspect ratio and quality
        """
        target_width, target_height = self.config['target_size']
        
        # Calculate aspect ratios
        original_ratio = image.width / image.height
        target_ratio = target_width / target_height
        
        if original_ratio > target_ratio:
            # Image is wider, fit by height
            new_height = target_height
            new_width = int(target_height * original_ratio)
        else:
            # Image is taller, fit by width
            new_width = target_width
            new_height = int(target_width / original_ratio)
        
        # Resize with high-quality resampling
        resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Center crop to exact target size
        if new_width != target_width or new_height != target_height:
            left = (new_width - target_width) // 2
            top = (new_height - target_height) // 2
            right = left + target_width
            bottom = top + target_height
            
            resized = resized.crop((left, top, right, bottom))
        
        return resized

    def _normalize_lighting(self, image: Image.Image) -> Image.Image:
        """
        Normalize lighting conditions for consistent analysis
        """
        # Convert to LAB color space for better lighting control
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2LAB)
        
        # Split channels
        l, a, b = cv2.split(cv_image)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_normalized = clahe.apply(l)
        
        # Merge channels back
        normalized = cv2.merge([l_normalized, a, b])
        
        # Convert back to RGB
        rgb_normalized = cv2.cvtColor(normalized, cv2.COLOR_LAB2RGB)
        
        return Image.fromarray(rgb_normalized)

    def _correct_colors(self, image: Image.Image) -> Image.Image:
        """
        Apply color correction for more accurate plant analysis
        """
        # Convert to numpy array for processing
        img_array = np.array(image, dtype=np.float32) / 255.0
        
        # Apply white balance correction
        # Calculate average values for each channel
        avg_r = np.mean(img_array[:, :, 0])
        avg_g = np.mean(img_array[:, :, 1])
        avg_b = np.mean(img_array[:, :, 2])
        
        # Calculate scaling factors (normalize to green channel)
        scale_r = avg_g / avg_r if avg_r > 0 else 1.0
        scale_b = avg_g / avg_b if avg_b > 0 else 1.0
        
        # Apply gentle color correction (not too aggressive)
        correction_strength = 0.3
        scale_r = 1.0 + (scale_r - 1.0) * correction_strength
        scale_b = 1.0 + (scale_b - 1.0) * correction_strength
        
        # Apply corrections
        img_array[:, :, 0] *= scale_r
        img_array[:, :, 2] *= scale_b
        
        # Clip values and convert back
        img_array = np.clip(img_array * 255, 0, 255).astype(np.uint8)
        
        return Image.fromarray(img_array)

    def _enhance_quality(self, image: Image.Image) -> Image.Image:
        """
        Enhance image quality with contrast and sharpness adjustments
        """
        # Enhance contrast
        contrast_enhancer = ImageEnhance.Contrast(image)
        image = contrast_enhancer.enhance(self.config['contrast_enhancement'])
        
        # Enhance sharpness
        sharpness_enhancer = ImageEnhance.Sharpness(image)
        image = sharpness_enhancer.enhance(self.config['sharpness_enhancement'])
        
        return image

    def _reduce_noise(self, image: Image.Image) -> Image.Image:
        """
        Apply noise reduction while preserving important details
        """
        # Convert to OpenCV format
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Apply bilateral filter for noise reduction while preserving edges
        denoised = cv2.bilateralFilter(cv_image, 9, 75, 75)
        
        # Convert back to PIL
        rgb_denoised = cv2.cvtColor(denoised, cv2.COLOR_BGR2RGB)
        
        return Image.fromarray(rgb_denoised)

    def _save_image(self, image: Image.Image, output_path: str) -> None:
        """Save processed image with optimal settings"""
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save with high quality
        save_kwargs = {
            'quality': self.config['quality'],
            'optimize': True
        }
        
        # Add progressive JPEG for better loading
        if output_path.lower().endswith(('.jpg', '.jpeg')):
            save_kwargs['progressive'] = True
        
        image.save(output_path, **save_kwargs)

    def _get_applied_preprocessing(self) -> list:
        """Get list of preprocessing steps that were applied"""
        steps = [
            'resize_to_512x512',
            'lighting_normalization',
            'contrast_enhancement',
            'sharpness_enhancement'
        ]
        
        if self.config['auto_crop']:
            steps.insert(0, 'auto_crop_plant_focus')
        
        if self.config['color_correction']:
            steps.append('color_correction')
        
        if self.config['noise_reduction']:
            steps.append('noise_reduction')
        
        return steps

    def _calculate_quality_metrics(self, image: Image.Image) -> Dict[str, float]:
        """Calculate image quality metrics"""
        img_array = np.array(image)
        
        # Calculate basic metrics
        brightness = np.mean(img_array) / 255.0
        contrast = np.std(img_array) / 255.0
        
        # Calculate sharpness using Laplacian variance
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var() / 1000.0
        
        return {
            'brightness': round(brightness, 3),
            'contrast': round(contrast, 3),
            'sharpness': round(sharpness, 3)
        }

    def get_statistics(self) -> Dict[str, Any]:
        """Get processing statistics"""
        return {
            **self.stats,
            'config': self.config
        }

def main():
    """Command line interface for the image processor"""
    parser = argparse.ArgumentParser(description='CropGuard Image Preprocessing Service')
    parser.add_argument('input', help='Input image path')
    parser.add_argument('output', help='Output image path')
    parser.add_argument('--config', help='JSON config file path')
    parser.add_argument('--metadata', help='JSON metadata string')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Load configuration
    config = {}
    if args.config and os.path.exists(args.config):
        with open(args.config, 'r') as f:
            config = json.load(f)
    
    # Parse metadata
    metadata = {}
    if args.metadata:
        try:
            metadata = json.loads(args.metadata)
        except json.JSONDecodeError:
            logger.warning("Invalid metadata JSON, ignoring")
    
    # Initialize processor
    processor = CropImageProcessor(config)
    
    # Process image
    result = processor.process_image(args.input, args.output, metadata)
    
    # Output result as JSON
    print(json.dumps(result, indent=2))
    
    # Return appropriate exit code
    sys.exit(0 if result['success'] else 1)

if __name__ == '__main__':
    main()
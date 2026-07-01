import 'package:flutter/material.dart';

class OtoyaliImageWithFallback extends StatelessWidget {
  const OtoyaliImageWithFallback({
    super.key,
    this.width,
    this.height,
    this.imageUrl,
    this.borderRadius = 8,
    this.fitMode = 'cover',
    this.backgroundColor = const Color(0xFFF6F8FB),
    this.iconColor = const Color(0xFF8A93A3),
  });

  final double? width;
  final double? height;
  final String? imageUrl;
  final double borderRadius;
  final String fitMode;
  final Color backgroundColor;
  final Color iconColor;

  BoxFit _boxFit() {
    switch (fitMode) {
      case 'contain':
        return BoxFit.contain;
      case 'fill':
        return BoxFit.fill;
      case 'cover':
      default:
        return BoxFit.cover;
    }
  }

  @override
  Widget build(BuildContext context) {
    final url = imageUrl?.trim();

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Container(
        width: width,
        height: height,
        color: backgroundColor,
        child: url == null || url.isEmpty
            ? _FallbackIcon(iconColor: iconColor)
            : Image.network(
                url,
                fit: _boxFit(),
                errorBuilder: (_, __, ___) => _FallbackIcon(iconColor: iconColor),
                loadingBuilder: (context, child, progress) {
                  if (progress == null) {
                    return child;
                  }

                  return const _ImageLoadingState();
                },
              ),
      ),
    );
  }
}

class _FallbackIcon extends StatelessWidget {
  const _FallbackIcon({required this.iconColor});

  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Icon(
        Icons.directions_car_filled_rounded,
        color: iconColor,
        size: 32,
      ),
    );
  }
}

class _ImageLoadingState extends StatelessWidget {
  const _ImageLoadingState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: SizedBox(
        width: 18,
        height: 18,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: Color(0xFF175CFF),
        ),
      ),
    );
  }
}

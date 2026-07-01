import 'package:flutter/material.dart';

class OtoyaliLoadingSkeleton extends StatefulWidget {
  const OtoyaliLoadingSkeleton({
    super.key,
    this.width,
    this.height,
    this.borderRadius = 8,
    this.baseColor = const Color(0xFFEEF2F7),
    this.highlightColor = const Color(0xFFF8FAFC),
  });

  final double? width;
  final double? height;
  final double borderRadius;
  final Color baseColor;
  final Color highlightColor;

  @override
  State<OtoyaliLoadingSkeleton> createState() => _OtoyaliLoadingSkeletonState();
}

class _OtoyaliLoadingSkeletonState extends State<OtoyaliLoadingSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final slide = _controller.value * 2 - 1;

        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: Alignment(-1 + slide, 0),
              end: Alignment(1 + slide, 0),
              colors: [
                widget.baseColor,
                widget.highlightColor,
                widget.baseColor,
              ],
              stops: const [0.2, 0.5, 0.8],
            ),
          ),
        );
      },
    );
  }
}

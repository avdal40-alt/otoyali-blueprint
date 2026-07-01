import 'package:flutter/material.dart';

class OtoyaliPriceText extends StatelessWidget {
  const OtoyaliPriceText({
    super.key,
    this.width,
    this.height,
    required this.priceAmount,
    this.currency = 'TRY',
    this.textColor = const Color(0xFF090B0F),
    this.fontSize = 20,
    this.fontWeightValue = 800,
    this.maxLines = 1,
  });

  final double? width;
  final double? height;
  final int priceAmount;
  final String currency;
  final Color textColor;
  final double fontSize;
  final int fontWeightValue;
  final int maxLines;

  String _formatPrice(int value) {
    final raw = value.toString();
    final buffer = StringBuffer();

    for (var i = 0; i < raw.length; i++) {
      final remaining = raw.length - i;
      buffer.write(raw[i]);
      if (remaining > 1 && remaining % 3 == 1) {
        buffer.write('.');
      }
    }

    return buffer.toString();
  }

  FontWeight _fontWeightFromValue(int value) {
    if (value >= 800) {
      return FontWeight.w800;
    }
    if (value >= 700) {
      return FontWeight.w700;
    }
    if (value >= 600) {
      return FontWeight.w600;
    }
    if (value >= 500) {
      return FontWeight.w500;
    }
    return FontWeight.w400;
  }

  @override
  Widget build(BuildContext context) {
    final formattedCurrency = currency.trim().isEmpty ? 'TRY' : currency.trim();

    return SizedBox(
      width: width,
      height: height,
      child: Text(
        '${_formatPrice(priceAmount)} $formattedCurrency',
        maxLines: maxLines,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: textColor,
          fontSize: fontSize,
          fontWeight: _fontWeightFromValue(fontWeightValue),
          height: 1.2,
          letterSpacing: 0,
        ),
      ),
    );
  }
}

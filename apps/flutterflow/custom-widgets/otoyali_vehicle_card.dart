import 'package:flutter/material.dart';

class OtoyaliVehicleCard extends StatelessWidget {
  const OtoyaliVehicleCard({
    super.key,
    this.width,
    this.height,
    required this.listingId,
    required this.imageUrl,
    required this.title,
    required this.priceAmount,
    this.currency = 'TRY',
    required this.city,
    required this.year,
    required this.mileageKm,
    required this.fuelType,
    required this.transmission,
  });

  final double? width;
  final double? height;
  final String listingId;
  final String imageUrl;
  final String title;
  final double priceAmount;
  final String currency;
  final String city;
  final int year;
  final int mileageKm;
  final String fuelType;
  final String transmission;

  static const _textColor = Color(0xFF090B0F);
  static const _mutedColor = Color(0xFF5B6472);
  static const _subtleColor = Color(0xFF8A93A3);
  static const _surfaceAlt = Color(0xFFF6F8FB);
  static const _borderColor = Color(0xFFE6EAF0);
  static const _blue = Color(0xFF175CFF);

  String _formatNumber(num value) {
    final raw = value.round().toString();
    final buffer = StringBuffer();

    for (var i = 0; i < raw.length; i++) {
      final remaining = raw.length - i;
      buffer.write(raw[i]);
      if (remaining > 1 && remaining % 3 == 1) {
        buffer.write(',');
      }
    }

    return buffer.toString();
  }

  String _formatPrice() {
    final code = currency.trim().isEmpty ? 'TRY' : currency.trim().toUpperCase();
    return '${_formatNumber(priceAmount)} $code';
  }

  String _labelForFuel(String value) {
    switch (value.trim().toLowerCase()) {
      case 'gasoline':
        return 'Petrol';
      case 'diesel':
        return 'Diesel';
      case 'lpg':
        return 'LPG';
      case 'electric':
        return 'Electric';
      case 'hybrid':
        return 'Hybrid';
      default:
        return _titleCase(value);
    }
  }

  String _labelForTransmission(String value) {
    switch (value.trim().toLowerCase()) {
      case 'manual':
        return 'Manual';
      case 'automatic':
        return 'Automatic';
      default:
        return _titleCase(value);
    }
  }

  String _titleCase(String value) {
    final clean = value.trim();
    if (clean.isEmpty) {
      return '-';
    }
    return clean[0].toUpperCase() + clean.substring(1).toLowerCase();
  }

  String _specLine() {
    final separator = ' \u2022 ';
    return [
      year.toString(),
      '${_formatNumber(mileageKm)} km',
      _labelForTransmission(transmission),
      _labelForFuel(fuelType),
    ].join(separator);
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'OTOYALI listing $listingId, $title',
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: _borderColor),
          boxShadow: const [
            BoxShadow(
              color: Color(0x14090B0F),
              blurRadius: 18,
              offset: Offset(0, 6),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 16 / 10,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  _VehicleImage(imageUrl: imageUrl),
                  Positioned(
                    top: 10,
                    right: 10,
                    child: const _FavoriteButton(),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title.trim().isEmpty ? 'OTOYALI listing' : title.trim(),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _textColor,
                      fontSize: 16,
                      height: 1.25,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _formatPrice(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _textColor,
                      fontSize: 20,
                      height: 1.2,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _specLine(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _mutedColor,
                      fontSize: 13,
                      height: 1.35,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 16,
                        color: _subtleColor,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          city.trim().isEmpty ? '-' : city.trim(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: _subtleColor,
                            fontSize: 13,
                            height: 1.25,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VehicleImage extends StatelessWidget {
  const _VehicleImage({required this.imageUrl});

  final String imageUrl;

  @override
  Widget build(BuildContext context) {
    final url = imageUrl.trim();

    if (url.isEmpty) {
      return const _ImageFallback();
    }

    return Image.network(
      url,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => const _ImageFallback(),
      loadingBuilder: (context, child, progress) {
        if (progress == null) {
          return child;
        }
        return const _ImageLoading();
      },
    );
  }
}

class _ImageFallback extends StatelessWidget {
  const _ImageFallback();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: OtoyaliVehicleCard._surfaceAlt,
      child: const Center(
        child: Icon(
          Icons.directions_car_filled_rounded,
          size: 40,
          color: OtoyaliVehicleCard._subtleColor,
        ),
      ),
    );
  }
}

class _ImageLoading extends StatelessWidget {
  const _ImageLoading();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: OtoyaliVehicleCard._surfaceAlt,
      child: const Center(
        child: SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: OtoyaliVehicleCard._blue,
          ),
        ),
      ),
    );
  }
}

class _FavoriteButton extends StatelessWidget {
  const _FavoriteButton();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: const Color(0xF0FFFFFF),
        shape: BoxShape.circle,
        border: Border.all(color: OtoyaliVehicleCard._borderColor),
      ),
      child: const Icon(
        Icons.favorite_border_rounded,
        size: 20,
        color: OtoyaliVehicleCard._textColor,
      ),
    );
  }
}

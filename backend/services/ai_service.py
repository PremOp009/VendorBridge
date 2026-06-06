"""
AI Vendor Recommendation Service
Scoring weights: Price 40% + Delivery 30% + Rating 30%
"""


def score_quotations(quotations):
    """
    Score and rank quotations using AI-like smart recommendation.
    Returns list of quotations with scores and recommendation flags.
    """
    if not quotations:
        return []

    # Extract metrics
    prices = [float(q['price']) for q in quotations]
    deliveries = [int(q['delivery_days']) for q in quotations]
    ratings = [float(q.get('vendor', {}).get('rating', 0)) for q in quotations]

    min_price = min(prices) if prices else 1
    max_price = max(prices) if prices else 1
    min_delivery = min(deliveries) if deliveries else 1
    max_delivery = max(deliveries) if deliveries else 1
    max_rating = max(ratings) if ratings else 5

    scored = []
    for q in quotations:
        price = float(q['price'])
        delivery = int(q['delivery_days'])
        rating = float(q.get('vendor', {}).get('rating', 0))

        # Price score: lower is better (0-100)
        if max_price == min_price:
            price_score = 100
        else:
            price_score = 100 - ((price - min_price) / (max_price - min_price) * 100)

        # Delivery score: faster is better (0-100)
        if max_delivery == min_delivery:
            delivery_score = 100
        else:
            delivery_score = 100 - ((delivery - min_delivery) / (max_delivery - min_delivery) * 100)

        # Rating score: higher is better (0-100)
        rating_score = (rating / 5.0) * 100 if max_rating > 0 else 0

        # Weighted composite score
        composite = (price_score * 0.40) + (delivery_score * 0.30) + (rating_score * 0.30)

        scored.append({
            **q,
            'ai_score': round(composite, 2),
            'price_score': round(price_score, 2),
            'delivery_score': round(delivery_score, 2),
            'rating_score': round(rating_score, 2),
            'is_cheapest': False,
            'is_fastest': False,
            'is_top_rated': False,
            'is_recommended': False,
        })

    # Mark distinctions
    if scored:
        # Cheapest
        cheapest = min(scored, key=lambda x: float(x['price']))
        cheapest['is_cheapest'] = True

        # Fastest
        fastest = min(scored, key=lambda x: int(x['delivery_days']))
        fastest['is_fastest'] = True

        # Top rated
        top_rated = max(scored, key=lambda x: float(x.get('vendor', {}).get('rating', 0)))
        top_rated['is_top_rated'] = True

        # Overall recommended (highest AI score)
        recommended = max(scored, key=lambda x: x['ai_score'])
        recommended['is_recommended'] = True

    # Sort by AI score descending
    scored.sort(key=lambda x: x['ai_score'], reverse=True)

    return scored


def get_vendor_performance(vendor_quotations):
    """Calculate vendor performance metrics from historical quotations"""
    if not vendor_quotations:
        return {
            'total_bids': 0,
            'win_rate': 0,
            'avg_price': 0,
            'avg_delivery': 0,
            'performance_grade': 'N/A'
        }

    total = len(vendor_quotations)
    wins = sum(1 for q in vendor_quotations if q.get('status') == 'accepted')
    prices = [float(q['price']) for q in vendor_quotations]
    deliveries = [int(q['delivery_days']) for q in vendor_quotations]

    win_rate = (wins / total * 100) if total > 0 else 0
    avg_price = sum(prices) / len(prices) if prices else 0
    avg_delivery = sum(deliveries) / len(deliveries) if deliveries else 0

    # Performance grade
    if win_rate >= 60:
        grade = 'A'
    elif win_rate >= 40:
        grade = 'B'
    elif win_rate >= 20:
        grade = 'C'
    else:
        grade = 'D'

    return {
        'total_bids': total,
        'wins': wins,
        'win_rate': round(win_rate, 1),
        'avg_price': round(avg_price, 2),
        'avg_delivery': round(avg_delivery, 1),
        'performance_grade': grade
    }

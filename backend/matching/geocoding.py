import logging

import httpx

logger = logging.getLogger(__name__)


async def geocode_address(endereco: str) -> tuple[float, float] | None:
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"format": "json", "q": endereco, "limit": 1}
        headers = {"User-Agent": "AlimentaAI/1.0"}
        async with httpx.AsyncClient(timeout=httpx.Timeout(8.0)) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
            if not data:
                return None
            return (float(data[0]["lat"]), float(data[0]["lon"]))
    except Exception as e:
        logger.warning("geocode_address falhou: %s", e)
        return None

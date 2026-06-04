import logging

import httpx

logger = logging.getLogger(__name__)


async def geocode_address(endereco: str) -> tuple[float, float] | None:
    """Geocodifica um endereço completo usando Nominatim (OpenStreetMap)."""
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


async def fetch_cep(cep: str) -> dict | None:
    """Busca um CEP no ViaCEP e retorna dados estruturados do endereço.

    Retorna dict com chaves: cep, logradouro, bairro, cidade, uf.
    Combina com Nominatim para incluir lat/long (geocoding reverso por endereço).
    Retorna None se CEP não encontrado.
    """
    # Limpa o CEP (só dígitos)
    digits = "".join(c for c in cep if c.isdigit())
    if len(digits) != 8:
        return None

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(8.0)) as client:
            # 1) ViaCEP: dados do endereço
            r = await client.get(f"https://viacep.com.br/ws/{digits}/json/")
            r.raise_for_status()
            data = r.json()
            if data.get("erro"):
                return None

            result = {
                "cep": data.get("cep", digits),
                "logradouro": data.get("logradouro", ""),
                "bairro": data.get("bairro", ""),
                "cidade": data.get("localidade", ""),
                "uf": data.get("uf", ""),
                "complemento": data.get("complemento", ""),
            }

            # 2) Nominatim: lat/long (opcional, falha silenciosa)
            query = f"{result['logradouro']}, {result['bairro']}, {result['cidade']}, {result['uf']}, Brasil"
            try:
                r2 = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"format": "json", "q": query, "limit": 1},
                    headers={"User-Agent": "AlimentaAI/1.0"},
                )
                r2.raise_for_status()
                geo = r2.json()
                if geo:
                    result["latitude"] = float(geo[0]["lat"])
                    result["longitude"] = float(geo[0]["lon"])
            except Exception as e:
                logger.debug("Nominatim falhou para CEP %s: %s", digits, e)

            return result
    except Exception as e:
        logger.warning("fetch_cep falhou: %s", e)
        return None

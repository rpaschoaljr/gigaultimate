def processar_comando_front(dados):
    """
    Processa os dados recebidos do front-end (case insensitive) 
    e retorna o comando correspondente para o Arduino

    Args:
        dados (str): Dados recebidos do front-end

    Returns:
        str: Comando formatado para o Arduino em maiúsculas
             ou None se não for um comando válido
    """
    if not dados or not isinstance(dados, str):
        return None

    # Converte para maiúsculas e remove espaços extras
    dados = dados.strip().upper()

    # Mapeamento completo dos comandos válidos
    COMANDOS_VALIDOS = {
        # Equipos
        "EQUIPO LIN": "[011]",
        "EQUIPO PERFURADOR": "[012]",
        "EQUIPO STK": "[013]",
        "EQUIPO ATX": "[014]",
        "EQUIPO EVOLUTION": "[015]",

        # Segmentos
        "SEGMENTO ATX": "[021]",
        "SEGMENTO EVO": "[022]",
        "SEGMENTO PERFURADOR": "[023]",
        "SEGMENTO STK": "[024]"
    }

    return COMANDOS_VALIDOS.get(dados)

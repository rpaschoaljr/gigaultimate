import re
from datetime import datetime


def processar_resposta_arduino(dados):
    """
    Processa mensagens do Arduino com regras específicas:
    - [T1X] → X (0 ou 1) determina status booleano
    - [CPEXXX] → XXX é o valor de pressão
    - [CPMXXX] → XXX é o valor do manômetro
    """
    if not dados or not isinstance(dados, str):
        return None

    resultado = {
        'timestamp': datetime.now().isoformat(),
        'Pressurization': None,
        'Pressao_Equipo': None,
        'Pressao_Manometro': None,
        'raw_data': dados
    }

    # Processa cada tag individualmente
    tags = re.findall(r'\[([A-Za-z0-9]+)\]', dados)

    for tag in tags:
        # Tags de teste (T1X)
        if tag.startswith('T1'):
            valor = tag[2:]  # Pega o que vem depois de T1
            if valor == '1':
                resultado['Pressurization'] = True
            elif valor == '0':
                resultado['Pressurization'] = False

        # Tags de pressão (CPEXXX)
        elif tag.startswith('CPE'):
            valor_pressao = tag[3:]  # Pega tudo depois de CPE
            try:
                resultado['Pressao_Equipo'] = float(valor_pressao)
            except ValueError:
                pass

        # Tags de manômetro (CPMXXX)
        elif tag.startswith('CPM'):
            valor_manometro = tag[3:]  # Pega tudo depois de CPM
            try:
                resultado['Pressao_Manometro'] = float(valor_manometro)
            except ValueError:
                pass

    return resultado if any(v is not None for k, v in resultado.items() if k not in ['timestamp', 'raw_data']) else None


# Exemplo de uso:
if __name__ == "__main__":
    testes = [
        "[T11][CPE123][CPM456]",  # Caso válido
        "[T10][CPE12.5][CPM45.6]",  # Valores decimais
        "[T11][CPEinválido][CPM456]",  # Valor inválido
        "[T12]",  # Tag desconhecida
        "SEM FORMATO VÁLIDO"
    ]

    print("Exemplos de processamento:")
    for teste in testes:
        print(f"\nEntrada: {teste}")
        processado = processar_resposta_arduino(teste)
        print("Saída:", processado)

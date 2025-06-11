from arduino_communicator import ArduinoCommunicator
from front_communicator import FrontCommunicator
from arduino_responses import processar_resposta_arduino
import time


def main():
    # Inicializar comunicadores
    arduino = ArduinoCommunicator()
    frontend = FrontCommunicator()

    # Iniciar conexões
    arduino.conectar()
    frontend.iniciar_servidor()

    print("\nSistema de Monitoramento Integrado")
    print("----------------------------------------")
    print("Aguardando conexões...")
    print("Pressione Ctrl+C para sair")

    ultima_tentativa_arduino = time.time()
    ultima_leitura = None

    try:
        while True:
            # Gerenciar conexão com Arduino
            if not arduino.connected and (time.time() - ultima_tentativa_arduino) > 0.5:
                print("Tentando reconectar ao Arduino...")
                arduino.conectar()
                ultima_tentativa_arduino = time.time()

            # Ler e processar dados do Arduino
            if arduino.connected:
                leitura = arduino.read_message()
                if leitura:
                    ultima_leitura = leitura
                    print(f"Dados brutos: {ultima_leitura}", end='\r')

                    # Processar a resposta do Arduino
                    dados_processados = processar_resposta_arduino(
                        ultima_leitura)

                    if dados_processados:
                        # Enviar dados processados para o front-end
                        if frontend.connected_clients:
                            frontend.enviar_dados({
                                **dados_processados,
                                "tipo": "dados_processados",
                                "timestamp": time.time()
                            })

            # Processar comandos do front-end
            dados_front = frontend.obter_dados()
            if dados_front and arduino.connected:
                if isinstance(dados_front, str):  # Comando direto para o Arduino
                    arduino.send_message(dados_front)
                elif isinstance(dados_front, dict) and dados_front.get("comando"):
                    arduino.send_message(dados_front["comando"])

            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\nEncerrando sistema...")
    finally:
        arduino.desconectar()
        frontend.parar_servidor()


if __name__ == "__main__":
    main()

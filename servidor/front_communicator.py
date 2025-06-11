import socket
import select
import json
from threading import Thread
import time
from model_test import processar_comando_front


class FrontCommunicator:
    def __init__(self, host='0.0.0.0', port=5000):
        self.host = host
        self.port = port
        self.server_socket = None
        self.connected_clients = []
        self.running = False
        self.data_to_send = None  # Dados para enviar aos clientes
        self.received_data = None  # Dados recebidos dos clientes

    def iniciar_servidor(self):
        """Inicia o servidor socket em uma thread separada"""
        try:
            self.server_socket = socket.socket(
                socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(
                socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.bind((self.host, self.port))
            self.server_socket.listen(5)
            self.server_socket.setblocking(False)

            self.running = True
            thread = Thread(target=self._manter_conexoes)
            thread.daemon = True
            thread.start()

            print(f"Servidor front-end iniciado em {self.host}:{self.port}")
            return True

        except Exception as e:
            print(f"Erro ao iniciar servidor: {e}")
            return False

    def _manter_conexoes(self):
        """Gerencia conexões com clientes (executado em thread separada)"""
        while self.running:
            try:
                # Aceitar novas conexões
                read_sockets, _, _ = select.select(
                    [self.server_socket], [], [], 0.5)
                for sock in read_sockets:
                    client_socket, client_address = sock.accept()
                    self.connected_clients.append(client_socket)
                    print(f"Novo cliente conectado: {client_address}")

                # Ler dados dos clientes
                if self.connected_clients:
                    readable, _, _ = select.select(
                        self.connected_clients, [], [], 0.5)
                    for sock in readable:
                        try:
                            data = sock.recv(4096)
                            if data:
                                self.received_data = json.loads(
                                    data.decode('utf-8'))
                                print(
                                    f"Dados recebidos do front-end: {self.received_data}")
                            else:
                                self._remover_cliente(sock)
                        except (ConnectionResetError, json.JSONDecodeError) as e:
                            self._remover_cliente(sock)

                # Enviar dados para os clientes
                if self.data_to_send and self.connected_clients:
                    data = json.dumps(self.data_to_send).encode('utf-8')
                    # Usar cópia da lista
                    for client in self.connected_clients[:]:
                        try:
                            client.sendall(data)
                        except (ConnectionResetError, BrokenPipeError):
                            self._remover_cliente(client)
                    self.data_to_send = None  # Limpar após envio

            except Exception as e:
                print(f"Erro na comunicação: {e}")
                time.sleep(1)

    def _remover_cliente(self, client_socket):
        """Remove um cliente desconectado"""
        try:
            if client_socket in self.connected_clients:
                client_address = client_socket.getpeername()
                self.connected_clients.remove(client_socket)
                client_socket.close()
                print(f"Cliente desconectado: {client_address}")
        except:
            pass

    def enviar_dados(self, dados):
        """Define dados para serem enviados aos clientes"""
        self.data_to_send = dados

    def obter_dados(self):
        """Processa e retorna dados do front-end de forma segura"""
        try:
            dados = self.received_data
            self.received_data = None

            if dados:
                comando = processar_comando_front(dados)
                if comando:
                    return comando
                print(f"Comando não reconhecido: {repr(dados)}")

            return None

        except Exception as e:
            print(f"Erro ao processar dados: {e}")
            return None

    def parar_servidor(self):
        """Encerra o servidor socket"""
        self.running = False
        for client in self.connected_clients:
            client.close()
        if self.server_socket:
            self.server_socket.close()
        print("Servidor front-end encerrado")

    def __del__(self):
        self.parar_servidor()

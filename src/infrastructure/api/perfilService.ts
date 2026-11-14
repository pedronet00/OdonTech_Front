import ApiClient from './apiClient';
import type { AlterarSenhaRequest, AtualizarPerfilRequest, Perfil } from '../../domain/models/types';

/** Perfil do usuário logado. O usuário vem do token, então nenhuma rota leva id. */

export const obterPerfil = () => ApiClient.get<Perfil>('/perfil');

export const atualizarPerfil = (dto: AtualizarPerfilRequest) => ApiClient.put<Perfil>('/perfil', dto);

export const alterarSenha = (dto: AlterarSenhaRequest) => ApiClient.put<boolean>('/perfil/senha', dto);

// Script principal para animações da landing page Vínculo Atípico

(function() {
    'use strict';

    // Verificar se o usuário prefere movimento reduzido
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /**
     * IntersectionObserver para animações de reveal on scroll
     */
    function initRevealAnimations() {
        if (prefersReducedMotion) {
            // Se movimento reduzido, apenas tornar visível sem animação
            const reveals = document.querySelectorAll('.reveal');
            reveals.forEach(el => {
                el.classList.add('reveal--visible');
            });
            return;
        }

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal--visible');
                    // Opcional: parar de observar após aparecer
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observar todos os elementos com classe .reveal
        const reveals = document.querySelectorAll('.reveal');
        reveals.forEach(el => {
            revealObserver.observe(el);
        });
    }

    /**
     * Efeito de scroll no navbar
     */
    function initNavbarScroll() {
        if (prefersReducedMotion) {
            return;
        }

        const header = document.querySelector('.nav-header');
        if (!header) return;

        let lastScroll = 0;
        const scrollThreshold = 10;

        function handleScroll() {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

            if (currentScroll > scrollThreshold) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        }

        // Throttle para performance
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    /**
     * Parallax sutil no hero image (apenas desktop com mouse)
     */
    function initHeroParallax() {
        if (prefersReducedMotion) {
            return;
        }

        // Verificar se é dispositivo com mouse (não touch)
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            return;
        }

        const heroContainer = document.querySelector('.hero-image-container');
        if (!heroContainer) return;

        heroContainer.addEventListener('mousemove', (e) => {
            const rect = heroContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const moveX = (x - centerX) / centerX * 5; // Movimento muito sutil (5px max)
            const moveY = (y - centerY) / centerY * 5;
            
            const overlay = heroContainer.querySelector('.hero-overlay');
            if (overlay) {
                overlay.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.01)`;
            }
        }, { passive: true });

        heroContainer.addEventListener('mouseleave', () => {
            const overlay = heroContainer.querySelector('.hero-overlay');
            if (overlay) {
                overlay.style.transform = '';
            }
        });
    }

    /**
     * Configuração do Supabase
     */
    const SUPABASE_URL = 'https://grkymuhfynxyvjotybtx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdya3ltdWhmeW54eXZqb3R5YnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NzQ3MDQsImV4cCI6MjA2MzI1MDcwNH0.A9XArGrao7hqcCQXxD-vdD-tcURftfaA6Y8mB3-7qY0';
    
    let supabaseClient = null;
    
    /**
     * Inicializar cliente Supabase
     */
    function initSupabase() {
        try {
            if (typeof supabase !== 'undefined' && supabase.createClient) {
                supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('✅ Supabase inicializado com sucesso');
                return true;
            } else {
                console.warn('⚠️ Supabase ainda não está disponível');
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase:', error);
            return false;
        }
    }

    /**
     * Formatar valor monetário
     */
    function formatarValor(valor) {
        if (!valor || valor === 0) {
            return 'Gratuito';
        }
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(valor);
    }

    /**
     * Buscar planos do Supabase
     */
    async function buscarPlanos() {
        if (!supabaseClient) {
            console.error('❌ Supabase não inicializado');
            return [];
        }

        try {
            console.log('🔍 Buscando planos no Supabase...');
            
            // Buscar planos da modalidade familiar
            // Removido filtro de 'ativo' pois a coluna não existe
            const { data: planos, error: planosError } = await supabaseClient
                .from('planos')
                .select('*')
                .eq('modalidade', 'familiar')
                .order('valor_mes', { ascending: true });

            if (planosError) {
                console.error('❌ Erro ao buscar planos:', planosError);
                console.error('Detalhes:', JSON.stringify(planosError, null, 2));
                return [];
            }

            console.log(`✅ ${planos?.length || 0} plano(s) encontrado(s)`, planos);

            if (!planos || planos.length === 0) {
                console.warn('⚠️ Nenhum plano encontrado');
                return [];
            }

            // Buscar benefícios para cada plano
            console.log('🔍 Buscando benefícios dos planos...');
            const planosComBeneficios = await Promise.all(
                planos.map(async (plano) => {
                    try {
                        // Tentar diferentes nomes de campos para a relação
                        let beneficios = null;
                        let beneficiosError = null;
                        
                        // Tentar com plano_id
                        let result = await supabaseClient
                            .from('beneficios_plano')
                            .select('*')
                            .eq('plano_id', plano.id);
                        
                        beneficios = result.data;
                        beneficiosError = result.error;
                        
                        // Se não encontrar, tentar com id_plano
                        if ((!beneficios || beneficios.length === 0) && !beneficiosError) {
                            result = await supabaseClient
                                .from('beneficios_plano')
                                .select('*')
                                .eq('id_plano', plano.id);
                            
                            beneficios = result.data;
                            beneficiosError = result.error;
                        }
                        
                        // Ordenar se houver campo ordem
                        if (beneficios && beneficios.length > 0) {
                            if (beneficios[0].ordem !== undefined) {
                                beneficios.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
                            }
                        }

                        if (beneficiosError) {
                            console.warn(`⚠️ Erro ao buscar benefícios do plano ${plano.id}:`, beneficiosError);
                        }

                        console.log(`✅ Plano ${plano.nome || plano.id}: ${beneficios?.length || 0} benefício(s)`);

                        return {
                            ...plano,
                            beneficios: beneficios || []
                        };
                    } catch (error) {
                        console.error(`❌ Erro ao processar benefícios do plano ${plano.id}:`, error);
                        return {
                            ...plano,
                            beneficios: []
                        };
                    }
                })
            );

            console.log('✅ Planos com benefícios carregados:', planosComBeneficios);
            return planosComBeneficios;
        } catch (error) {
            console.error('❌ Erro ao buscar planos:', error);
            console.error('Stack:', error.stack);
            return [];
        }
    }

    /**
     * Renderizar planos no DOM
     */
    function renderizarPlanos(planos) {
        const container = document.getElementById('planos-container');
        if (!container) return;

        if (planos.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-lg opacity-70">Nenhum plano disponível no momento.</p>
                </div>
            `;
            return;
        }

        // Determinar qual plano é o mais popular (meio do array ou com mais benefícios)
        const planoPopularIndex = planos.length > 1 ? Math.floor(planos.length / 2) : -1;

        container.innerHTML = planos.map((plano, index) => {
            const isPopular = index === planoPopularIndex && planos.length > 1;
            const valorFormatado = formatarValor(plano.valor_mes);
            const isGratuito = !plano.valor_mes || plano.valor_mes === 0;
            const corIcone = isPopular ? 'text-primary' : 'text-secondary';
            const corRadio = isPopular ? 'text-primary focus:ring-primary' : 'text-secondary focus:ring-secondary';
            const corTexto = isPopular ? 'text-primary' : 'text-secondary';
            const borderClass = isPopular ? 'border-2 border-primary' : 'border border-transparent hover:border-secondary';
            const shadowClass = isPopular ? 'shadow-2xl' : 'shadow-sm';
            const transformClass = isPopular && planos.length > 1 ? 'transform md:-translate-y-4' : '';
            const fontWeight = isPopular ? 'font-bold' : 'font-medium';

            // Separar valor em partes se não for gratuito
            let valorHtml = '';
            if (isGratuito) {
                valorHtml = `<span class="text-3xl font-black">Gratuito</span>`;
            } else {
                const valorParts = valorFormatado.split(',');
                valorHtml = `
                    <span class="text-sm font-bold">R$</span>
                    <span class="text-4xl font-black">${valorParts[0].replace('R$', '').trim()},${valorParts[1]?.substring(0, 2) || '00'}</span>
                    <span class="text-sm opacity-70">/mês</span>
                `;
            }

            // Renderizar benefícios
            const beneficiosHtml = plano.beneficios && plano.beneficios.length > 0
                ? plano.beneficios.map(beneficio => {
                    // Tentar diferentes campos para o texto do benefício
                    const textoBeneficio = beneficio.descricao || 
                                          beneficio.nome || 
                                          beneficio.texto || 
                                          beneficio.titulo ||
                                          beneficio.beneficio ||
                                          '';
                    if (!textoBeneficio) {
                        console.warn('⚠️ Benefício sem texto:', beneficio);
                        return '';
                    }
                    return `
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined ${corIcone} text-lg">check_circle</span>
                            <span class="text-sm">${textoBeneficio}</span>
                        </div>
                    `;
                }).filter(Boolean).join('')
                : '';

            return `
                <div class="bg-white dark:bg-background-dark p-8 rounded-xl flex flex-col gap-6 ${shadowClass} ${borderClass} ${transformClass} transition-colors reveal ${isPopular ? 'relative' : ''}">
                    ${isPopular ? `
                        <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                            Mais Popular
                        </div>
                    ` : ''}
                    <div class="flex flex-col gap-2">
                        <h3 class="text-2xl font-bold">${plano.nome_plano || plano.nome || 'Plano'}</h3>
                        <div class="flex items-baseline gap-1">
                            ${valorHtml}
                        </div>
                    </div>
                    <p class="text-sm opacity-70">${plano.caracteristicas || plano.descricao || plano.desc || ''}</p>
                    <div class="flex-grow flex flex-col gap-4 py-4">
                        ${beneficiosHtml || '<p class="text-sm opacity-50">Nenhum benefício cadastrado.</p>'}
                    </div>
                    <div class="flex items-center">
                        <label class="flex items-center gap-3 cursor-pointer">
                            <input ${index === planoPopularIndex ? 'checked=""' : ''} class="w-5 h-5 ${corRadio} border-gray-300 rounded-full" name="plan" type="radio" value="${plano.id}"/>
                            <span class="${fontWeight}">Selecionar</span>
                        </label>
                    </div>
                </div>
            `;
        }).join('');

        // Re-inicializar animações reveal para os novos elementos
        setTimeout(() => {
            initRevealAnimations();
        }, 100);
    }

    /**
     * Carregar e renderizar planos
     */
    async function carregarPlanos() {
        const container = document.getElementById('planos-container');
        if (!container) {
            console.error('❌ Container de planos não encontrado');
            return;
        }

        try {
            console.log('🚀 Iniciando carregamento de planos...');
            const planos = await buscarPlanos();
            
            if (planos.length === 0) {
                console.warn('⚠️ Nenhum plano para renderizar');
                container.innerHTML = `
                    <div class="col-span-full text-center py-8">
                        <p class="text-lg opacity-70">Nenhum plano disponível no momento.</p>
                    </div>
                `;
                return;
            }

            console.log(`🎨 Renderizando ${planos.length} plano(s)...`);
            renderizarPlanos(planos);
            console.log('✅ Planos renderizados com sucesso');
        } catch (error) {
            console.error('❌ Erro ao carregar planos:', error);
            console.error('Stack:', error.stack);
            if (container) {
                container.innerHTML = `
                    <div class="col-span-full text-center py-8">
                        <p class="text-lg opacity-70 text-red-500">Erro ao carregar planos. Tente recarregar a página.</p>
                        <p class="text-sm opacity-50 mt-2">Verifique o console para mais detalhes.</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Buscar links da tabela links_
     */
    async function buscarLinks() {
        if (!supabaseClient) {
            console.error('❌ Supabase não inicializado para buscar links');
            return {};
        }

        try {
            console.log('🔍 Buscando links no Supabase...');
            
            const { data: links, error: linksError } = await supabaseClient
                .from('links_')
                .select('nome, link');

            if (linksError) {
                console.error('❌ Erro ao buscar links:', linksError);
                return {};
            }

            if (!links || links.length === 0) {
                console.warn('⚠️ Nenhum link encontrado');
                return {};
            }

            // Converter array em objeto para fácil acesso
            const linksObj = {};
            links.forEach(item => {
                linksObj[item.nome] = item.link;
            });

            console.log('✅ Links carregados:', linksObj);
            return linksObj;
        } catch (error) {
            console.error('❌ Erro ao buscar links:', error);
            return {};
        }
    }

    /**
     * Aplicar links nos botões e elementos
     */
    function aplicarLinks(links) {
        // Botão Entrar
        const btnEntrar = document.getElementById('btn-entrar');
        if (btnEntrar && links.site_web_familiar) {
            btnEntrar.onclick = () => window.open(links.site_web_familiar, '_blank');
            btnEntrar.style.cursor = 'pointer';
        }

        // Botão Entrar como Profissional
        const btnEntrarProf = document.getElementById('btn-entrar-profissional');
        if (btnEntrarProf && links.site_profissional_web) {
            btnEntrarProf.onclick = () => window.open(links.site_profissional_web, '_blank');
            btnEntrarProf.style.cursor = 'pointer';
        }

        // Botão Cadastrar-se agora
        const btnCadastrar = document.getElementById('btn-cadastrar');
        if (btnCadastrar && links.site_web_familiar) {
            btnCadastrar.onclick = () => window.open(links.site_web_familiar, '_blank');
            btnCadastrar.style.cursor = 'pointer';
        }

        // Botão Começar gratuitamente
        const btnComecarGratis = document.getElementById('btn-comecar-gratis');
        if (btnComecarGratis && links.site_web_familiar) {
            btnComecarGratis.onclick = () => window.open(links.site_web_familiar, '_blank');
            btnComecarGratis.style.cursor = 'pointer';
        }

        // Link VA Admin
        const linkVAAdmin = document.getElementById('link-va-admin');
        if (linkVAAdmin && links.site_admin) {
            linkVAAdmin.href = links.site_admin;
            linkVAAdmin.target = '_blank';
            linkVAAdmin.rel = 'noopener noreferrer';
        }

        // Link WhatsApp
        const linkWhatsapp = document.getElementById('link-whatsapp');
        if (linkWhatsapp && links.whatsapp) {
            linkWhatsapp.href = links.whatsapp;
        }

        // Link Instagram
        const linkInstagram = document.getElementById('link-instagram');
        if (linkInstagram && links.instagram) {
            linkInstagram.href = links.instagram;
        }

        // Centro de Ajuda (suporte_contato da tabela links_)
        const linkCentroAjuda = document.getElementById('link-centro-ajuda');
        if (linkCentroAjuda) {
            linkCentroAjuda.href = links.suporte_contato || 'https://atypia.com.br/#contato';
            linkCentroAjuda.target = '_blank';
            linkCentroAjuda.rel = 'noopener noreferrer';
        }

        console.log('✅ Links aplicados nos elementos');
    }

    /**
     * Carregar e aplicar links
     */
    async function carregarLinks() {
        try {
            const links = await buscarLinks();
            aplicarLinks(links);
        } catch (error) {
            console.error('❌ Erro ao carregar links:', error);
        }
    }

    /**
     * Buscar políticas de privacidade da tabela privacy_policies
     */
    async function buscarPoliticasPrivacidade() {
        if (!supabaseClient) return [];

        try {
            const { data, error } = await supabaseClient
                .from('privacy_policies')
                .select('title, description')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('❌ Erro ao buscar políticas de privacidade:', error);
                return [];
            }
            return data || [];
        } catch (err) {
            console.error('❌ Erro ao buscar políticas:', err);
            return [];
        }
    }

    /**
     * Renderizar conteúdo do modal de políticas e termos
     */
    function renderizarConteudoModalPoliticas(politicas) {
        const container = document.getElementById('modal-politicas-conteudo');
        if (!container) return;

        if (!politicas || politicas.length === 0) {
            container.innerHTML = '<p class="opacity-70">Nenhuma política de privacidade ou termo de uso publicado no momento.</p>';
            return;
        }

        container.innerHTML = politicas.map(p => {
            const titulo = p.title || '';
            const descricao = (p.description || '').replace(/\n/g, '<br>');
            return `
                <div class="mb-6">
                    <h4 class="text-base font-bold text-[#1b0e0d] dark:text-[#fcf8f8] mb-2">${titulo}</h4>
                    <div class="whitespace-pre-wrap">${descricao}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Inicializar modal de políticas de privacidade e termos de uso
     */
    function initModalPoliticas() {
        const modal = document.getElementById('modal-politicas');
        const backdrop = document.getElementById('modal-politicas-backdrop');
        const btnFechar = document.getElementById('modal-politicas-fechar');
        const linkPoliticas = document.getElementById('link-politicas-termos');
        if (!modal || !linkPoliticas) return;

        let politicasCarregadas = null;

        function abrirModal() {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            const conteudo = document.getElementById('modal-politicas-conteudo');
            if (conteudo) conteudo.innerHTML = '<p class="opacity-70">Carregando...</p>';

            (async () => {
                if (politicasCarregadas === null) {
                    politicasCarregadas = await buscarPoliticasPrivacidade();
                }
                renderizarConteudoModalPoliticas(politicasCarregadas);
            })();
        }

        function fecharModal() {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        linkPoliticas.addEventListener('click', (e) => {
            e.preventDefault();
            abrirModal();
        });
        if (backdrop) backdrop.addEventListener('click', fecharModal);
        if (btnFechar) btnFechar.addEventListener('click', fecharModal);

        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') fecharModal();
        });
    }

    /**
     * Inicialização quando o DOM estiver pronto
     */
    function init() {
        console.log('🚀 Inicializando aplicação...');
        initRevealAnimations();
        initNavbarScroll();
        initHeroParallax();
        initModalPoliticas();
        
        // Tentar inicializar Supabase e carregar planos
        function tentarCarregarPlanos() {
            console.log('🔧 Tentando inicializar Supabase...');
            
            if (initSupabase()) {
                console.log('✅ Supabase inicializado, carregando planos e links...');
                carregarPlanos();
                carregarLinks();
            } else {
                console.log('⏳ Aguardando Supabase carregar...');
                let tentativas = 0;
                const maxTentativas = 50; // 5 segundos (50 * 100ms)
                
                // Aguardar Supabase carregar (pode estar carregando via CDN)
                const checkSupabase = setInterval(() => {
                    tentativas++;
                    
                    if (typeof supabase !== 'undefined' && supabase.createClient) {
                        console.log(`✅ Supabase detectado após ${tentativas} tentativa(s)`);
                        if (initSupabase()) {
                            carregarPlanos();
                            carregarLinks();
                            clearInterval(checkSupabase);
                        }
                    } else if (tentativas >= maxTentativas) {
                        clearInterval(checkSupabase);
                        const container = document.getElementById('planos-container');
                        if (container) {
                            container.innerHTML = `
                                <div class="col-span-full text-center py-8">
                                    <p class="text-lg opacity-70">Erro ao conectar com o servidor. Tente recarregar a página.</p>
                                    <p class="text-sm opacity-50 mt-2">Verifique sua conexão com a internet.</p>
                                </div>
                            `;
                        }
                        console.error('❌ Supabase não carregou a tempo após', maxTentativas, 'tentativas');
                    }
                }, 100);
            }
        }
        
        // Aguardar um pouco para garantir que o script do Supabase foi carregado
        if (document.readyState === 'complete') {
            console.log('📄 DOM já completo, iniciando carregamento...');
            setTimeout(tentarCarregarPlanos, 200);
        } else {
            console.log('📄 Aguardando DOM carregar...');
            window.addEventListener('load', () => {
                console.log('📄 DOM carregado, iniciando carregamento...');
                setTimeout(tentarCarregarPlanos, 200);
            });
        }
    }

    // Aguardar DOM carregado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

package org.fao.geonet.repository;

import org.fao.geonet.ApplicationContextHolder;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Nonnull;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.Assert.*;
import static org.junit.Assert.assertEquals;

@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations = {
        AbstractSpringDataTest.CLASSPATH_CONFIG_SPRING_GEONETWORK_PARENT_XML,
        AbstractSpringDataTest.CLASSPATH_CONFIG_SPRING_GEONETWORK_XML,
        AbstractSpringDataTest.CLASSPATH_REPOSITORY_TEST_CONTEXT_XML})
@Transactional(propagation = Propagation.REQUIRED)
public abstract class AbstractSpringDataTest {

    public static final String CLASSPATH_CONFIG_SPRING_GEONETWORK_XML = "classpath*:config-spring-geonetwork.xml";
    public static final String CLASSPATH_CONFIG_SPRING_GEONETWORK_PARENT_XML = "classpath*:config-spring-geonetwork-parent.xml";
    public static final String CLASSPATH_REPOSITORY_TEST_CONTEXT_XML = "classpath:domain-repository-test-context.xml";

    protected AtomicInteger _inc = new AtomicInteger();

    private static ThreadLocal<TransactionlessTesting> transactionlessTesting = new InheritableThreadLocal<TransactionlessTesting>();

    @Autowired
    private ConfigurableApplicationContext _appContext;


    @AfterClass
    public static void shutdownTransactionlessTesting() {
        TransactionlessTesting.shutdown();
    }
    @Before
    public void setApplicationContextInApplicationHolder() {
        ApplicationContextHolder.set(_appContext);
    }

    /**
     * Find a file on the classpath in the same directory (or root) as the current class and return a stream to that file.
     *
     * @param fileName the name of the file.
     */
    @Nonnull
    protected InputStream fileStream(@Nonnull String fileName) {
        final InputStream stream = getClass().getResourceAsStream(fileName);
        if (stream != null) {
            return stream;
        } else {
            final InputStream resourceAsStream = getClass().getClassLoader().getResourceAsStream(fileName);
            if (resourceAsStream != null) {
                return resourceAsStream;
            }
        }

        throw new IllegalArgumentException(fileName + " not found");

    }

    /**
     * Compares all properties of expected to actual.
     * <ul>
     * <li>.equals is used for comparison.</li>
     * <li>Each element in an array is checked</li>
     * </ul>
     *
     * @param expected
     * @param actual
     */
    public static final <T> void assertSameContents(@Nonnull T expected, T actual, String... skipProperties) throws Exception {
        Set<String> skip = new HashSet<String>(Arrays.asList(skipProperties));
        assertNotNull(actual);
        assertEquals(expected.getClass(), actual.getClass());


        Set<Map.Entry<String, Object>> expectedProperties = getProperties(expected, skip).entrySet();
        Map<String, Object> actualProperties = getProperties(actual, skip);

        assertEquals(expectedProperties.size(), actualProperties.size());

        for (Map.Entry<String, Object> expectedProperty : expectedProperties) {
            if (skip.contains(expectedProperty.getKey())) {
                continue;
            }

            Object actualProperty = actualProperties.get(expectedProperty.getKey());
            if (actualProperty == null && expectedProperty.getValue() != null) {
                fail("Value for " + expectedProperty.getKey() + " was null be we expected it to be " + expectedProperty.getValue());
            } else if (actualProperty == null && expectedProperty.getValue() == null) {
                continue;
            } else if (actualProperty != null && actualProperty.getClass().isArray()) {
                assertArrayEquals(expectedProperty.getKey() + " does not match", (Object[]) expectedProperty.getValue(),
                        (Object[]) actualProperty);
            } else {
                assertEquals(expectedProperty.getKey() + " does not match", expectedProperty.getValue(), actualProperty);
            }
        }
    }

    private static <T> Map<String, Object> getProperties(T actual, Set<String> skip) throws Exception {
        Map<String, Object> props = new HashMap<String, Object>();
        Method[] methods = actual.getClass().getMethods();
        for (Method method : methods) {
            if (method.getName().matches("(get)|(is).+") && !skip.contains(method.getName())
                && method.getParameterTypes().length == 0) {
                Object value = method.invoke(actual);
                props.put(method.getName(), value);
            }
        }
        return props;
    }

    /**
     * All the tests in subclasses of {@link org.fao.geonet.repository.AbstractSpringDataTest} take place
     * in a transaction which is normally what one wants, however for certain tests (specifically tests that
     * need to test the behaviour of transactions) the tests need to take place outside of a transaction to make sure
     * the behaviour is correct.  This class is used to run test code in a separate thread and thus outside of the current
     * transaction.
     * <p>
     *     To use one must obtain a {@link org.fao.geonet.repository.AbstractSpringDataTest.TransactionlessTesting} instance
     *     with the {@link #get()} method.  Then the test can be ran with the
     *     {@link #run(org.fao.geonet.repository.AbstractSpringDataTest.TestTask)}.
     * </p>
     */
    protected static class TransactionlessTesting {
        private ExecutorService _executorService;

        /**
         * Obtain the instance for this thread.  This can be called as many times as desired in the same thread
         * and it will return the same instance.  If shutdown is called it will shutdown the instance and get() will
         * return a new instance.
         *
         * @return the instance for the current thread.  It will always be ready to use.
         */
        public static TransactionlessTesting get() {
            synchronized (TransactionlessTesting.class) {
                TransactionlessTesting testingHarness = transactionlessTesting.get();
                if (testingHarness == null) {
                    testingHarness = new TransactionlessTesting();
                    transactionlessTesting.set(testingHarness);
                    testingHarness._executorService = Executors.newSingleThreadExecutor();
                }
                return testingHarness;
            }
        }

        /**
         * Shutdown thread pool.  This must be called as clean up.
         */
        private static void shutdown() {
            synchronized (TransactionlessTesting.class) {
                TransactionlessTesting testingHarness = transactionlessTesting.get();
                if (testingHarness!= null) {
                    transactionlessTesting.remove();
                    testingHarness._executorService.shutdownNow();
                    testingHarness._executorService = null;
                }
            }
        }

        /**
         * Execute the test code in a separate thread from the current thread.  Make sure that no transactions are left
         * open after method is called.
         *
         * @param task task to run.
         */
        public void run(final TestTask task) throws Exception {
            final Exception[] error = new Exception[1];
            final Future<Object> future = _executorService.submit(new Callable<Object>() {
                @Override
                public Object call() throws Exception {
                    try {
                        task.run();
                    } catch (Exception throwable) {
                        error[0] = throwable;
                    }
                    return null;
                }
            });

            long startWait = System.currentTimeMillis();
            while (!future.isDone() && startWait + TimeUnit.MINUTES.toMillis(10) > System.currentTimeMillis()) {
                Thread.sleep(400);
            }
            assertTrue(future.isDone());
            if (error[0] != null) {
                throw error[0];
            }

        }
    }

    public static interface TestTask {
        public void run() throws Exception;
    }

}
